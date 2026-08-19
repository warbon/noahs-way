import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { createInquiry } from "@/lib/inquiry-repository"
import { isTravelType, type InquirySource } from "@/lib/inquiry-types"
import { notifyNewInquiry } from "@/lib/inquiry-notifier"
import { getPackagesByCategory } from "@/lib/package-repository"
import { derivePackageSlug } from "@/lib/package-slug"
import { checkInquiryRateLimit } from "@/lib/rate-limit"

const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 200
const MAX_MOBILE_LENGTH = 40
const MAX_FREEFORM_LENGTH = 200
const MAX_MESSAGE_LENGTH = 4000
const MAX_PACKAGE_TITLE_LENGTH = 200

// Deliberately permissive: the goal is to reject typos, not to police valid
// addresses. Anything shaped like a@b.c passes.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Accepts +63, 09xx, spaces, dashes and brackets; requires 7–15 digits. */
function isUsableMobile(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

/** Collapses runs of blank lines but keeps paragraph breaks in the message body. */
function sanitizeMultiline(value: string) {
  return value.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

function readOptionalCount(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) return undefined
  return parsed
}

/** Accepts an ISO yyyy-mm-dd date from the form's native date inputs. */
function readOptionalDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  return value
}

/**
 * Resolves the package the customer was reading, from the catalog rather than
 * from the request, so a spoofed title can never be stored.
 */
async function resolvePackageSnapshot(packageId: string | undefined) {
  if (!packageId) return {}

  for (const category of ["local", "international"] as const) {
    const packages = await getPackagesByCategory(category, { includeDrafts: true })
    const match = packages.find((pkg) => pkg.id === packageId)
    if (match) {
      return {
        packageId: match.id,
        packageTitle: match.title,
        packageSlug: derivePackageSlug(match),
        packageCategory: category
      }
    }
  }

  return {}
}

function readOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined
  const cleaned = sanitizeText(value)
  if (!cleaned) return undefined
  return cleaned.slice(0, maxLength)
}

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse("Invalid request body", 400)
  }

  const body = payload as Record<string, unknown>

  // Honeypot: a real browser leaves this hidden field empty. Bots fill it in.
  // Respond 200 so the bot can't distinguish rejection from success.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true })
  }

  const allowed = await checkInquiryRateLimit(getClientIp(request))
  if (!allowed) {
    return errorResponse("Too many inquiries sent. Please try again shortly.", 429)
  }

  const nameValue = body.name
  const emailValue = body.email
  const mobileValue = body.mobile

  if (
    typeof nameValue !== "string" ||
    typeof emailValue !== "string" ||
    typeof mobileValue !== "string"
  ) {
    return errorResponse("Name, mobile number, and email address are required", 400)
  }

  const name = sanitizeText(nameValue).slice(0, MAX_NAME_LENGTH)
  const email = sanitizeText(emailValue).slice(0, MAX_EMAIL_LENGTH)
  const mobile = sanitizeText(mobileValue).slice(0, MAX_MOBILE_LENGTH)

  if (!name || !email || !mobile) {
    return errorResponse("Name, mobile number, and email address are required", 400)
  }

  if (!EMAIL_PATTERN.test(email)) {
    return errorResponse("Please enter a valid email address", 400)
  }

  if (!isUsableMobile(mobile)) {
    return errorResponse("Please enter a valid mobile number", 400)
  }

  // Optional now that the structured booking fields carry the request.
  const message =
    typeof body.message === "string"
      ? sanitizeMultiline(body.message).slice(0, MAX_MESSAGE_LENGTH) || undefined
      : undefined

  const packageSnapshot = await resolvePackageSnapshot(
    readOptionalString(body.packageId, MAX_PACKAGE_TITLE_LENGTH)
  )
  const source: InquirySource = packageSnapshot.packageId ? "package-cta" : "contact-form"

  let created
  try {
    created = await createInquiry({
      name,
      mobile,
      email,
      message,
      destination: readOptionalString(body.destination, MAX_FREEFORM_LENGTH),
      airportOfOrigin: readOptionalString(body.airportOfOrigin, MAX_FREEFORM_LENGTH),
      travelDateFrom: readOptionalDate(body.travelDateFrom),
      travelDateTo: readOptionalDate(body.travelDateTo),
      flexibleOnPromoDates: body.flexibleOnPromoDates === true || body.flexibleOnPromoDates === "yes",
      adults: readOptionalCount(body.adults),
      children: readOptionalCount(body.children),
      childAges: readOptionalString(body.childAges, MAX_FREEFORM_LENGTH),
      travelType: isTravelType(body.travelType) ? body.travelType : undefined,
      ...packageSnapshot,
      source
    })
  } catch (error) {
    // Never echo the submitted content back in the error.
    console.error("Failed to store inquiry", error)
    return errorResponse(
      "We couldn't save your inquiry. Please message us on Messenger or call us instead.",
      503
    )
  }

  await notifyNewInquiry(created)
  revalidatePath("/admin/inquiries")

  return NextResponse.json({ ok: true }, { status: 201 })
}
