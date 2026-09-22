/**
 * Where an uploaded image belongs. The value becomes the top-level folder, so
 * package posters and condo photos never land in the same directory — which
 * matters on delete, where the routing is done by path prefix.
 */
export type ImageCollection = "packages" | "stays"

export type SavePackageImageParams = {
  collection: ImageCollection
  /**
   * Subfolder within the collection: the package category, or "units" for a
   * stay. Callers pass a validated value; adapters slugify it regardless, so a
   * stray segment can never escape the collection directory.
   */
  folder: string
  title: string
  file: File
  /**
   * File extension (including the leading dot, e.g. ".jpg") derived from the
   * validated MIME type by the caller. Adapters must use this rather than the
   * client-supplied filename, so an attacker cannot control the stored suffix.
   */
  extension: string
}

export type SavePackageImageResult = {
  publicImagePath: string
}
