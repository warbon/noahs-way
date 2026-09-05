import { readFile } from "node:fs/promises"
import path from "node:path"

import type { FacebookPhotoInput } from "@/lib/facebook/graph"

/**
 * Gets the package poster into a form Facebook will accept.
 *
 * Two storage backends are in play and they need different answers. Blob
 * uploads are already public URLs, so Facebook can fetch them itself. The local
 * backend stores a path under `public/`, which on a dev machine or a private
 * deployment is an address Facebook's servers cannot reach at all — those have
 * to be read off disk and uploaded as bytes.
 */

const LOCAL_IMAGE_PREFIX = "/images/"

const extensionContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
}

export class PackageImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PackageImageError"
  }
}

function contentTypeForPath(filePath: string) {
  return extensionContentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream"
}

/**
 * True for a URL Facebook's own servers stand a chance of fetching. A localhost
 * or private-network address is reachable from this process and nowhere else,
 * so it has to be uploaded as bytes instead.
 */
function isPubliclyFetchable(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false

  const host = url.hostname.toLowerCase()
  return !(
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  )
}

async function readLocalImage(imagePath: string): Promise<FacebookPhotoInput> {
  const publicDir = path.join(process.cwd(), "public")
  const absolutePath = path.join(publicDir, imagePath)

  // The path comes from the store rather than a request, but a stored value is
  // still not a safe path — this keeps a hand-edited record from reading
  // anything outside public/.
  if (!absolutePath.startsWith(`${publicDir}${path.sep}`)) {
    throw new PackageImageError("The package image path is not inside the public folder")
  }

  try {
    const bytes = await readFile(absolutePath)
    return {
      kind: "binary",
      bytes,
      filename: path.basename(absolutePath),
      contentType: contentTypeForPath(absolutePath)
    }
  } catch {
    throw new PackageImageError(
      "The package image could not be read from disk. Re-upload the poster and try again."
    )
  }
}

async function downloadImage(url: string): Promise<FacebookPhotoInput> {
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    throw new PackageImageError(`The package image could not be downloaded (HTTP ${response.status})`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get("content-type") ?? contentTypeForPath(url)

  return {
    kind: "binary",
    bytes,
    filename: path.basename(new URL(url).pathname) || "package.jpg",
    contentType
  }
}

/**
 * Resolves the stored image path. The URL form is preferred when it will work,
 * since it saves pulling several megabytes through this process only to push
 * them straight back out.
 */
export async function resolvePackagePhoto(imagePath: string): Promise<FacebookPhotoInput> {
  const trimmed = imagePath?.trim()

  if (!trimmed) {
    throw new PackageImageError("This package has no image to post")
  }

  if (trimmed.startsWith(LOCAL_IMAGE_PREFIX)) {
    return readLocalImage(trimmed)
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new PackageImageError(`Unrecognised image path: ${trimmed}`)
  }

  return isPubliclyFetchable(url) ? { kind: "url", url: url.toString() } : downloadImage(url.toString())
}

/** Retry path for a URL post Facebook refused to fetch. */
export async function downloadPackagePhoto(url: string): Promise<FacebookPhotoInput> {
  return downloadImage(url)
}
