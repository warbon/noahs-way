import { createInquiry } from "@/lib/inquiry-repository"
import { notifyNewInquiry } from "@/lib/inquiry-notifier"
import { isTravelType, type InquiryRecord, type InquirySource } from "@/lib/inquiry-types"
import { getPackagesByCategory } from "@/lib/package-repository"
import { derivePackageSlug } from "@/lib/package-slug"

/**
 * One validated path from "someone asked to be contacted" to a stored lead.
 *
 * Both entry points use it — the classic contact form and the chat assistant's
 * Confirm button — so the rules cannot drift between them. Callers own the HTTP
 * concerns (parsing, honeypots, rate limits, cache revalidation); this owns
 * validation, package snapshotting, persistence and notification.
 */

const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 200
const MAX_MOBILE_LENGTH = 40
const MAX_FREEFORM_LENGTH = 200
const MAX_MESSAGE_LENGTH = 4000
const MAX_PACKAGE_ID_LENGTH = 200

// Deliberately permissive: the goal is to reject typos, not to police valid
// addresses. Anything shaped like a@b.c passes.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Accepts +63, 09xx, spaces, dashes and brackets; requires 7–15 digits. */
export function isUsableMobile(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

export function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

/** Collapses runs of blank lines but keeps paragraph breaks in the message body. */
export function sanitizeMultiline(value: string) {
  return value.trim().replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
}

export function readOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined
  const cleaned = sanitizeText(value)
  if (!cleaned) return undefined
  return cleaned.slice(0, maxLength)
}

export function readOptionalCount(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) return undefined
  return parsed
}

/** Accepts an ISO yyyy-mm-dd date from the form's native date inputs. */
export function readOptionalDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  return value
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
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
        packageCategory: category,
        /** Used only to backfill an empty destination; never stored as-is. */
        resolvedDestination: match.destination
      }
    }
  }

  return {}
}

export type InquirySubmissionResult =
  | { ok: true; inquiry: InquiryRecord }
  | { ok: false; status: 400 | 503; error: string }

export type SubmitInquiryOptions = {
  /**
   * Overrides the form-style derivation. The chat assistant passes
   * "chat-agent" so the owner can see which channel produced the lead.
   */
  source?: InquirySource
}

export async function submitInquiry(
  body: Record<string, unknown>,
  options: SubmitInquiryOptions = {}
): Promise<InquirySubmissionResult> {
  const nameValue = body.name
  const emailValue = body.email
  const mobileValue = body.mobile

  if (
    typeof nameValue !== "string" ||
    typeof emailValue !== "string" ||
    typeof mobileValue !== "string"
  ) {
    return { ok: false, status: 400, error: "Name, mobile number, and email address are required" }
  }

  const name = sanitizeText(nameValue).slice(0, MAX_NAME_LENGTH)
  const email = sanitizeText(emailValue).slice(0, MAX_EMAIL_LENGTH)
  const mobile = sanitizeText(mobileValue).slice(0, MAX_MOBILE_LENGTH)

  if (!name || !email || !mobile) {
    return { ok: false, status: 400, error: "Name, mobile number, and email address are required" }
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, status: 400, error: "Please enter a valid email address" }
  }

  if (!isUsableMobile(mobile)) {
    return { ok: false, status: 400, error: "Please enter a valid mobile number" }
  }

  const travelDateFrom = readOptionalDate(body.travelDateFrom)
  const travelDateTo = readOptionalDate(body.travelDateTo)
  const today = todayIso()

  // ISO dates compare correctly as strings, so no Date parsing is needed.
  if ((travelDateFrom && travelDateFrom < today) || (travelDateTo && travelDateTo < today)) {
    return { ok: false, status: 400, error: "Travel dates cannot be in the past" }
  }

  if (travelDateFrom && travelDateTo && travelDateTo < travelDateFrom) {
    return { ok: false, status: 400, error: "The return date must be on or after the departure date" }
  }

  // Optional now that the structured booking fields carry the request.
  const message =
    typeof body.message === "string"
      ? sanitizeMultiline(body.message).slice(0, MAX_MESSAGE_LENGTH) || undefined
      : undefined

  const { resolvedDestination, ...packageSnapshot } = await resolvePackageSnapshot(
    readOptionalString(body.packageId, MAX_PACKAGE_ID_LENGTH)
  )

  /**
   * A lead that names a package but no destination leaves the consultant's
   * Destination field blank. Fall back to the package's own destination so the
   * gap can't reopen if a caller stops sending one.
   */
  const destination =
    readOptionalString(body.destination, MAX_FREEFORM_LENGTH) ??
    (resolvedDestination ? sanitizeText(resolvedDestination).slice(0, MAX_FREEFORM_LENGTH) : undefined)

  const source: InquirySource =
    options.source ?? (packageSnapshot.packageId ? "package-cta" : "contact-form")

  try {
    const inquiry = await createInquiry({
      name,
      mobile,
      email,
      message,
      destination,
      airportOfOrigin: readOptionalString(body.airportOfOrigin, MAX_FREEFORM_LENGTH),
      travelDateFrom,
      travelDateTo,
      flexibleOnPromoDates:
        body.flexibleOnPromoDates === true || body.flexibleOnPromoDates === "yes",
      adults: readOptionalCount(body.adults),
      children: readOptionalCount(body.children),
      childAges: readOptionalString(body.childAges, MAX_FREEFORM_LENGTH),
      travelType: isTravelType(body.travelType) ? body.travelType : undefined,
      ...packageSnapshot,
      source
    })

    await notifyNewInquiry(inquiry)

    return { ok: true, inquiry }
  } catch (error) {
    // Never echo the submitted content back in the error.
    console.error("Failed to store inquiry", error)
    return {
      ok: false,
      status: 503,
      error:
        "We couldn't save your inquiry. Please message us on Messenger or call us instead."
    }
  }
}
