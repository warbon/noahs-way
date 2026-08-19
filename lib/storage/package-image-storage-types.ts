import type { PackageCategory } from "@/lib/package-data"

export type SavePackageImageParams = {
  category: PackageCategory
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
