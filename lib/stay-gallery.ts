import { savePackageImage } from "@/lib/package-image-storage"
import {
  ALLOWED_IMAGE_TYPES,
  MAX_GALLERY_PHOTOS,
  MAX_UPLOAD_SIZE_BYTES
} from "@/lib/stay-data"

export { ALLOWED_IMAGE_TYPES, MAX_GALLERY_PHOTOS, MAX_UPLOAD_SIZE_BYTES }

/**
 * Extra photos beyond the cover image.
 *
 * Kept out of `readStayOptionalFields` because these are files, not text: they
 * need uploading, size and type checks, and — on an edit — a diff against what
 * is already stored so removed photos get deleted from the backing store
 * rather than orphaned.
 */

export type GalleryResolution =
  | { ok: true; gallery: string[]; removed: string[] }
  | { ok: false; error: string }

/**
 * Works out the unit's new photo list from the submitted form.
 *
 * `gallery` carries the already-stored photos the admin chose to keep, in the
 * order they should appear. `galleryImages` carries newly chosen files, which
 * are appended after them.
 *
 * Kept paths are intersected against what the record actually holds rather than
 * trusted. Without that check the field would accept any string, and a crafted
 * request could point a listing's photos at an arbitrary URL — the images are
 * rendered straight into the page, so that is worth closing even on an
 * authenticated route.
 */
export async function resolveGallery(
  formData: FormData,
  existingGallery: string[] | undefined,
  title: string
): Promise<GalleryResolution> {
  const stored = existingGallery ?? []

  let kept: string[] = stored
  const keptRaw = formData.get("gallery")

  if (typeof keptRaw === "string") {
    let parsed: unknown
    try {
      parsed = JSON.parse(keptRaw)
    } catch {
      return { ok: false, error: "Could not read which photos to keep." }
    }

    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Could not read which photos to keep." }
    }

    // Order comes from the submission; membership comes from the record.
    kept = parsed.filter((path): path is string => typeof path === "string" && stored.includes(path))
  }

  const incoming = formData
    .getAll("galleryImages")
    .filter((value): value is File => value instanceof File && value.size > 0)

  if (kept.length + incoming.length > MAX_GALLERY_PHOTOS) {
    return {
      ok: false,
      error: `A unit can hold the cover photo plus ${MAX_GALLERY_PHOTOS} more. Remove some before adding others.`
    }
  }

  for (const file of incoming) {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return { ok: false, error: `"${file.name}" is over the 8MB limit.` }
    }
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      return { ok: false, error: `"${file.name}" is not a JPG, PNG or WEBP.` }
    }
  }

  const uploaded: string[] = []
  for (const file of incoming) {
    const { publicImagePath } = await savePackageImage({
      collection: "stays",
      folder: "units",
      title,
      file,
      extension: ALLOWED_IMAGE_TYPES[file.type]
    })
    uploaded.push(publicImagePath)
  }

  // Deduped as a backstop. The filename collision that made this necessary is
  // fixed in the storage adapters, but a record holding the same path twice
  // renders the same photo twice, and that is worth making impossible here as
  // well as unlikely there.
  const gallery = Array.from(new Set([...kept, ...uploaded]))

  return {
    ok: true,
    gallery,
    removed: stored.filter((path) => !gallery.includes(path))
  }
}
