import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { savePackageImage } from "@/lib/package-image-storage"
import { readStayOptionalFields, parseAmount, parseCount } from "@/lib/stay-form-fields"
import {
  ALLOWED_IMAGE_TYPES as allowedMimeTypeToExtension,
  MAX_UPLOAD_SIZE_BYTES,
  resolveGallery
} from "@/lib/stay-gallery"
import { createStay, getStays } from "@/lib/stay-repository"
import { deriveSlug } from "@/lib/slug"

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const formData = await request.formData()
  const titleValue = formData.get("title")
  const detailsValue = formData.get("details")
  const cityValue = formData.get("city")
  const imageValue = formData.get("image")

  if (
    typeof titleValue !== "string" ||
    typeof detailsValue !== "string" ||
    typeof cityValue !== "string"
  ) {
    return errorResponse("Missing required fields", 400)
  }

  const title = sanitizeText(titleValue)
  const details = sanitizeText(detailsValue)
  const city = sanitizeText(cityValue)

  if (!title || !details || !city) {
    return errorResponse("Title, details, and city are required", 400)
  }

  const nightlyRate = parseAmount(formData.get("nightlyRate"))
  if (nightlyRate === undefined || nightlyRate <= 0) {
    return errorResponse("A nightly rate above zero is required", 400)
  }

  const bedrooms = parseCount(formData.get("bedrooms"))
  if (bedrooms === undefined) {
    return errorResponse("Number of bedrooms is required", 400)
  }

  const maxGuests = parseCount(formData.get("maxGuests"))
  if (maxGuests === undefined || maxGuests < 1) {
    return errorResponse("Maximum guests must be at least 1", 400)
  }

  if (!(imageValue instanceof File)) {
    return errorResponse("Image file is required", 400)
  }

  if (imageValue.size <= 0) {
    return errorResponse("Uploaded image is empty", 400)
  }

  if (imageValue.size > MAX_UPLOAD_SIZE_BYTES) {
    return errorResponse("Image exceeds 8MB limit", 400)
  }

  const extension = allowedMimeTypeToExtension[imageValue.type]
  if (!extension) {
    return errorResponse("Unsupported image type. Use JPG, PNG, or WEBP.", 400)
  }

  // Both steps write to storage and both throw if the configured backend
  // rejects the write — most often because STAY_STORE/PACKAGE_STORE and
  // IMAGE_STORE are unset in a deployment, leaving the file backend selected
  // against a read-only filesystem. Uncaught, that reaches the panel as a bare
  // 500 with an HTML body, and the save simply appears to do nothing.
  let created: Awaited<ReturnType<typeof createStay>>

  try {
    const { publicImagePath } = await savePackageImage({
      collection: "stays",
      folder: "units",
      title,
      file: imageValue,
      extension
    })

    // Uploaded after the cover so a rejected extra photo cannot leave a unit
    // with no cover at all.
    const gallery = await resolveGallery(formData, [], title)
    if (!gallery.ok) {
      return errorResponse(gallery.error, 400)
    }

    created = await createStay({
      title,
      details,
      city,
      nightlyRate,
      bedrooms,
      maxGuests,
      imagePath: publicImagePath,
      previewImage: publicImagePath,
      ...(gallery.gallery.length > 0 ? { gallery: gallery.gallery } : {}),
      ...readStayOptionalFields(formData)
    })
  } catch (error) {
    console.error("[admin] Failed to store new stay", error)
    return errorResponse(
      "The unit could not be saved. Its storage backend rejected the write — check that PACKAGE_STORE (or STAY_STORE) and IMAGE_STORE are configured for this deployment.",
      500
    )
  }

  revalidatePath("/")
  revalidatePath("/stays")
  revalidatePath(`/stays/${deriveSlug(created, "stay")}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/stays")

  return NextResponse.json({ stay: created }, { status: 201 })
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const stays = await getStays({ includeDrafts: true })
  return NextResponse.json({ stays })
}
