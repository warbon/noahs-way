import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { deletePackageImage, savePackageImage } from "@/lib/package-image-storage"
import { readStayOptionalFields, parseAmount, parseCount } from "@/lib/stay-form-fields"
import {
  ALLOWED_IMAGE_TYPES as allowedMimeTypeToExtension,
  MAX_UPLOAD_SIZE_BYTES,
  resolveGallery
} from "@/lib/stay-gallery"
import { deleteStay, getStayById, updateStay } from "@/lib/stay-repository"
import type { UpdateStayPayload } from "@/lib/stay-repository-types"
import { deriveSlug } from "@/lib/slug"

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function revalidateStay(slug: string) {
  revalidatePath("/")
  revalidatePath("/stays")
  revalidatePath(`/stays/${slug}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/stays")
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const existing = await getStayById(params.id)
  if (!existing) {
    return errorResponse("Stay not found", 404)
  }

  const formData = await request.formData()
  const updates: UpdateStayPayload = { ...readStayOptionalFields(formData) }

  const titleValue = formData.get("title")
  if (typeof titleValue === "string") {
    const title = sanitizeText(titleValue)
    if (!title) return errorResponse("Title cannot be empty", 400)
    updates.title = title
  }

  const detailsValue = formData.get("details")
  if (typeof detailsValue === "string") {
    const details = sanitizeText(detailsValue)
    if (!details) return errorResponse("Details cannot be empty", 400)
    updates.details = details
  }

  const cityValue = formData.get("city")
  if (typeof cityValue === "string") {
    const city = sanitizeText(cityValue)
    if (!city) return errorResponse("City cannot be empty", 400)
    updates.city = city
  }

  if (formData.has("nightlyRate")) {
    const nightlyRate = parseAmount(formData.get("nightlyRate"))
    if (nightlyRate === undefined || nightlyRate <= 0) {
      return errorResponse("A nightly rate above zero is required", 400)
    }
    updates.nightlyRate = nightlyRate
  }

  if (formData.has("bedrooms")) {
    const bedrooms = parseCount(formData.get("bedrooms"))
    if (bedrooms === undefined) return errorResponse("Number of bedrooms is required", 400)
    updates.bedrooms = bedrooms
  }

  if (formData.has("maxGuests")) {
    const maxGuests = parseCount(formData.get("maxGuests"))
    if (maxGuests === undefined || maxGuests < 1) {
      return errorResponse("Maximum guests must be at least 1", 400)
    }
    updates.maxGuests = maxGuests
  }

  /*
    Replacing the photo is optional on an edit. The previous file is only
    deleted once the new record has been written, so a failed save never leaves
    a listing pointing at an image that no longer exists.
  */
  const imageValue = formData.get("image")
  let previousImagePath: string | undefined

  if (imageValue instanceof File && imageValue.size > 0) {
    if (imageValue.size > MAX_UPLOAD_SIZE_BYTES) {
      return errorResponse("Image exceeds 8MB limit", 400)
    }

    const extension = allowedMimeTypeToExtension[imageValue.type]
    if (!extension) {
      return errorResponse("Unsupported image type. Use JPG, PNG, or WEBP.", 400)
    }

    try {
      const { publicImagePath } = await savePackageImage({
        collection: "stays",
        folder: "units",
        title: updates.title ?? existing.title,
        file: imageValue,
        extension
      })

      updates.imagePath = publicImagePath
      updates.previewImage = publicImagePath
      previousImagePath = existing.imagePath
    } catch (error) {
      console.error("[admin] Failed to store stay image", error)
      return errorResponse(
        "The photo could not be saved. Check that IMAGE_STORE is configured for this deployment.",
        500
      )
    }
  }

  /*
    Extra photos: which stored ones to keep, plus any newly chosen files. The
    ones dropped are deleted only after the record is saved, so a failed write
    never leaves a listing pointing at files that are already gone.
  */
  let removedGallery: string[] = []

  if (formData.has("gallery") || formData.getAll("galleryImages").length > 0) {
    const gallery = await resolveGallery(
      formData,
      existing.gallery,
      updates.title ?? existing.title
    )

    if (!gallery.ok) {
      return errorResponse(gallery.error, 400)
    }

    updates.gallery = gallery.gallery
    removedGallery = gallery.removed
  }

  let updated: Awaited<ReturnType<typeof updateStay>>
  try {
    updated = await updateStay(params.id, updates)
  } catch (error) {
    console.error("[admin] Failed to update stay", error)
    return errorResponse(
      "The unit could not be saved. Its storage backend rejected the write — check that PACKAGE_STORE (or STAY_STORE) is configured for this deployment.",
      500
    )
  }

  if (!updated) {
    return errorResponse("Stay not found", 404)
  }

  if (previousImagePath && previousImagePath !== updated.imagePath) {
    await deletePackageImage(previousImagePath)
  }

  for (const image of removedGallery) {
    await deletePackageImage(image)
  }

  revalidateStay(deriveSlug(updated, "stay"))
  // The slug moves with the title, so the old URL has to be dropped too or it
  // keeps serving a cached page for a listing that has been renamed.
  revalidateStay(deriveSlug(existing, "stay"))

  return NextResponse.json({ stay: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const deleted = await deleteStay(params.id)
  if (!deleted) {
    return errorResponse("Stay not found", 404)
  }

  await deletePackageImage(deleted.imagePath)
  if (deleted.previewImage !== deleted.imagePath) {
    await deletePackageImage(deleted.previewImage)
  }
  for (const image of deleted.gallery ?? []) {
    await deletePackageImage(image)
  }

  revalidateStay(deriveSlug(deleted, "stay"))

  return NextResponse.json({ stay: deleted })
}
