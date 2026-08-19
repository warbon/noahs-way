import { del, put } from "@vercel/blob"

import type {
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "package"
}

function getBlobPrefix() {
  return process.env.BLOB_PACKAGE_IMAGE_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "packages"
}

/**
 * Stores the image in Vercel Blob. Auth uses the `BLOB_READ_WRITE_TOKEN`
 * environment variable, which Vercel injects when a Blob store is linked to
 * the project. Returns the public Blob URL.
 */
export async function savePackageImageToBlob({
  category,
  title,
  file,
  extension
}: SavePackageImageParams): Promise<SavePackageImageResult> {
  const objectPath = `${getBlobPrefix()}/${category}/${slugify(title)}-${Date.now()}${extension}`

  const arrayBuffer = await file.arrayBuffer()
  const blob = await put(objectPath, Buffer.from(arrayBuffer), {
    access: "public",
    contentType: file.type || undefined,
    addRandomSuffix: true
  })

  return { publicImagePath: blob.url }
}

export async function deletePackageImageFromBlob(imagePath: string): Promise<void> {
  await del(imagePath)
}
