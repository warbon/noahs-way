import type { PackageCategory } from "@/lib/package-data"
import {
  deriveSlug,
  findBySlug,
  resolveSlugCollisions as resolveSlugCollisionsGeneric,
  slugifyTitle,
  type SluggableRecord
} from "@/lib/slug"

/**
 * Package-flavoured wrappers over the shared slug helpers in `lib/slug.ts`.
 *
 * The generic versions moved there when condo stays needed the same algorithm;
 * these stay so the existing call sites — and the "package" fallback they
 * depend on — keep reading the way they did.
 */

export function slugifyPackageTitle(title: string) {
  return slugifyTitle(title, "package")
}

export function derivePackageSlug(pkg: SluggableRecord) {
  return deriveSlug(pkg, "package")
}

export function resolveSlugCollisions<T extends SluggableRecord>(records: T[]) {
  return resolveSlugCollisionsGeneric(records, "package")
}

export function findPackageBySlug<T extends SluggableRecord>(records: T[], slug: string) {
  return findBySlug(records, slug, "package")
}

export function buildPackageHref(category: PackageCategory, slug: string) {
  return `/packages/${category}/${slug}`
}
