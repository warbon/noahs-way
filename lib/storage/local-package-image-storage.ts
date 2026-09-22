import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  ImageCollection,
  SavePackageImageParams,
  SavePackageImageResult
} from "@/lib/storage/package-image-storage-types"

/**
 * A short random token appended to every stored filename.
 *
 * `Date.now()` alone is not unique enough. A multi-photo upload writes its
 * files in a tight loop, so several land inside the same millisecond, produce
 * the same filename, and silently overwrite each other — the record then holds
 * several entries pointing at one file, and the rest of the photos are gone
 * with no error anywhere. The Blob adapter never had this problem because it
 * passes `addRandomSuffix`; this is the local equivalent.
 */
function uniqueSuffix() {
  return Math.random().toString(36).slice(2, 8)
}

function slugify(value: string, fallback = "package") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || fallback
}

async function ensureImageDirectory(collection: ImageCollection, folder: string) {
  const dirPath = path.join(process.cwd(), "public", "images", collection, folder)
  await mkdir(dirPath, { recursive: true })
  return dirPath
}

export async function savePackageImageLocally({
  collection,
  folder,
  title,
  file,
  extension
}: SavePackageImageParams): Promise<SavePackageImageResult> {
  // Slugified here rather than trusted: `folder` reaching `path.join` unchecked
  // is the difference between a subdirectory and a path traversal.
  const safeFolder = slugify(folder, "other")
  const imageDirectory = await ensureImageDirectory(collection, safeFolder)
  const filename = `${slugify(title)}-${Date.now()}-${uniqueSuffix()}${extension}`
  const filePath = path.join(imageDirectory, filename)
  const publicImagePath = `/images/${collection}/${safeFolder}/${filename}`

  const arrayBuffer = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(arrayBuffer))

  return { publicImagePath }
}

export async function deletePackageImageLocally(publicImagePath: string): Promise<void> {
  const relative = publicImagePath.replace(/^\/+/, "")
  const filePath = path.join(process.cwd(), "public", relative)

  try {
    await unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error
  }
}
