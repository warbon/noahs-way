import { del, put } from "@vercel/blob"

import type {
  ImageCollection,
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

function slugify(value: string, fallback = "package") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || fallback
}

function getBlobPrefix(collection: ImageCollection) {
  const override =
    collection === "packages"
      ? process.env.BLOB_PACKAGE_IMAGE_PREFIX
      : process.env.BLOB_STAY_IMAGE_PREFIX

  return override?.trim().replace(/^\/+|\/+$/g, "") || collection
}

/**
 * Stores the image in Vercel Blob. Auth uses the `BLOB_READ_WRITE_TOKEN`
 * environment variable, which Vercel injects when a Blob store is linked to
 * the project. Returns the public Blob URL.
 */
export async function savePackageImageToBlob({
  collection,
  folder,
  title,
  file,
  extension
}: SavePackageImageParams): Promise<SavePackageImageResult> {
  // `addRandomSuffix` below already prevents collisions, but the base path
  // carries its own token too so the two adapters produce the same shape of
  // name and neither depends on the other's safety net.
  const objectPath = `${getBlobPrefix(collection)}/${slugify(folder, "other")}/${slugify(title)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`

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
