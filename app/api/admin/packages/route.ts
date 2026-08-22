import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { savePackageImage } from "@/lib/package-image-storage"
import { readStructuredFields } from "@/lib/package-form-fields"
import type { PackageCategory } from "@/lib/package-data"
import { createPackageRecord, getAllPackagesForAdmin } from "@/lib/package-repository"

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

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const formData = await request.formData()
  const categoryValue = formData.get("category")
  const titleValue = formData.get("title")
  const detailsValue = formData.get("details")
  const priceValue = formData.get("price")
  const imageValue = formData.get("image")

  if (
    typeof categoryValue !== "string" ||
    typeof titleValue !== "string" ||
    typeof detailsValue !== "string" ||
    typeof priceValue !== "string"
  ) {
    return errorResponse("Missing required fields", 400)
  }

  if (!isPackageCategory(categoryValue)) {
    return errorResponse("Invalid category", 400)
  }

  const category = categoryValue
  const title = sanitizeText(titleValue)
  const details = sanitizeText(detailsValue)
  const price = sanitizeText(priceValue)

  if (!title || !details || !price) {
    return errorResponse("Title, details, and price are required", 400)
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

  // Both steps write to storage, and both throw if the configured backend
  // cannot accept a write — most often because PACKAGE_STORE/IMAGE_STORE are
  // unset in a deployment, leaving the file backend selected against a
  // read-only filesystem. Uncaught, that surfaced as a bare 500 with an HTML
  // body, so the admin form could not parse a message out of it and the save
  // simply appeared to do nothing.
  let publicImagePath: string
  let createdPackage: Awaited<ReturnType<typeof createPackageRecord>>

  try {
    ;({ publicImagePath } = await savePackageImage({
      category,
      title,
      file: imageValue,
      extension
    }))

    createdPackage = await createPackageRecord({
      category,
      title,
      details,
      price,
      imagePath: publicImagePath,
      previewImage: publicImagePath,
      ...readStructuredFields(formData)
    })
  } catch (error) {
    console.error("[admin] Failed to store new package", error)
    return errorResponse(
      "The package could not be saved. Its storage backend rejected the write — check that PACKAGE_STORE and IMAGE_STORE are configured for this deployment.",
      500
    )
  }

  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath(`/packages/${category}`)
  revalidatePath(`/packages/${category}/${createdPackage.slug ?? ""}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/packages")

  return NextResponse.json({ package: createdPackage }, { status: 201 })
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const catalog = await getAllPackagesForAdmin()
  return NextResponse.json({ packages: catalog })
}
