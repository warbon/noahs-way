import type { UpdatePackagePayload } from "@/lib/package-repository-types"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { deletePackageImage, savePackageImage } from "@/lib/package-image-storage"
import { readStructuredFields } from "@/lib/package-form-fields"
import type { PackageCategory } from "@/lib/package-data"
import {
  deletePackageRecord,
  getAllPackagesForAdmin,
  updatePackageRecord
} from "@/lib/package-repository"

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

const allowedMimeTypeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
}

function isPackageCategory(value: string): value is PackageCategory {
  return value === "local" || value === "international"
}

function sanitizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

type RouteContext = {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const packageId = params.id
  if (!packageId) {
    return errorResponse("Package id is required", 400)
  }

  const updates: UpdatePackagePayload = {}

  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData()
    const categoryValue = formData.get("category")
    const titleValue = formData.get("title")
    const detailsValue = formData.get("details")
    const priceValue = formData.get("price")
    const imageValue = formData.get("image")

    if (typeof categoryValue !== "string" || !isPackageCategory(categoryValue)) {
      return errorResponse("Invalid category", 400)
    }
    updates.category = categoryValue

    if (typeof titleValue !== "string") return errorResponse("Invalid title", 400)
    const title = sanitizeText(titleValue)
    if (!title) return errorResponse("Title is required", 400)
    updates.title = title

    if (typeof detailsValue !== "string") return errorResponse("Invalid details", 400)
    const details = sanitizeText(detailsValue)
    if (!details) return errorResponse("Details are required", 400)
    updates.details = details

    if (typeof priceValue !== "string") return errorResponse("Invalid price", 400)
    const price = sanitizeText(priceValue)
    if (!price) return errorResponse("Price is required", 400)
    updates.price = price

    if (imageValue instanceof File && imageValue.size > 0) {
      if (imageValue.size > MAX_UPLOAD_SIZE_BYTES) {
        return errorResponse("Image exceeds 8MB limit", 400)
      }

      const extension = allowedMimeTypeToExtension[imageValue.type]
      if (!extension) {
        return errorResponse("Unsupported image type. Use JPG, PNG, or WEBP.", 400)
      }

      const { publicImagePath } = await savePackageImage({
        category: categoryValue,
        title,
        file: imageValue,
        extension
      })

      updates.imagePath = publicImagePath
      updates.previewImage = publicImagePath
    }

    Object.assign(updates, readStructuredFields(formData))
  } else {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) {
      return errorResponse("Invalid request body", 400)
    }

    if ("category" in body) {
      if (typeof body.category !== "string" || !isPackageCategory(body.category)) {
        return errorResponse("Invalid category", 400)
      }
      updates.category = body.category
    }

    if ("title" in body) {
      if (typeof body.title !== "string") return errorResponse("Invalid title", 400)
      const title = sanitizeText(body.title)
      if (!title) return errorResponse("Title is required", 400)
      updates.title = title
    }

    if ("details" in body) {
      if (typeof body.details !== "string") return errorResponse("Invalid details", 400)
      const details = sanitizeText(body.details)
      if (!details) return errorResponse("Details are required", 400)
      updates.details = details
    }

    if ("price" in body) {
      if (typeof body.price !== "string") return errorResponse("Invalid price", 400)
      const price = sanitizeText(body.price)
      if (!price) return errorResponse("Price is required", 400)
      updates.price = price
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("No changes provided", 400)
  }

  // When a new image replaces an old one, capture the old path first so we can
  // clean it up after a successful update.
  let previousImagePath: string | undefined
  if (updates.imagePath) {
    const catalog = await getAllPackagesForAdmin()
    const existing = [...catalog.local, ...catalog.international].find(
      (pkg) => pkg.id === packageId
    )
    previousImagePath = existing?.imagePath
  }

  const updated = await updatePackageRecord(packageId, updates)
  if (!updated) {
    return errorResponse("Package not found", 404)
  }

  if (previousImagePath && previousImagePath !== updated.imagePath) {
    await deletePackageImage(previousImagePath)
  }

  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath(`/packages/${updated.category}`)
  revalidatePath(`/packages/${updated.category}/${updated.slug ?? ""}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/packages")

  return NextResponse.json({ package: updated })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const packageId = params.id
  if (!packageId) {
    return errorResponse("Package id is required", 400)
  }

  const deleted = await deletePackageRecord(packageId)
  if (!deleted) {
    return errorResponse("Package not found", 404)
  }

  // Best-effort cleanup of the stored image so deletes don't orphan assets.
  await deletePackageImage(deleted.imagePath)
  if (deleted.previewImage && deleted.previewImage !== deleted.imagePath) {
    await deletePackageImage(deleted.previewImage)
  }

  revalidatePath("/")
  revalidatePath(`/packages/${deleted.category}`)
  revalidatePath("/admin/packages")

  return NextResponse.json({ package: deleted })
}
