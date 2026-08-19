import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import type { PackageCategory } from "@/lib/package-data"
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

async function ensurePackageImageDirectory(category: PackageCategory) {
  const dirPath = path.join(process.cwd(), "public", "images", "packages", category)
  await mkdir(dirPath, { recursive: true })
  return dirPath
}

export async function savePackageImageLocally({
  category,
  title,
  file,
  extension
}: SavePackageImageParams): Promise<SavePackageImageResult> {
  const imageDirectory = await ensurePackageImageDirectory(category)
  const filename = `${slugify(title)}-${Date.now()}${extension}`
  const filePath = path.join(imageDirectory, filename)
  const publicImagePath = `/images/packages/${category}/${filename}`

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
