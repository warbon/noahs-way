import type { PackageCategory } from "@/lib/package-data"

/**
 * Shared slug algorithm. Kept in one place so ids, URLs, and the seed script
 * can't drift apart.
 */
export function slugifyPackageTitle(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "package"
  )
}

type SluggableRecord = { title: string; slug?: string; id?: string }

export function derivePackageSlug(pkg: SluggableRecord) {
  return pkg.slug?.trim() || slugifyPackageTitle(pkg.title)
}

/**
 * Assigns a stable, unique slug to every record in a category. Later duplicates
 * get a `-2`, `-3` suffix in array order so the result is deterministic.
 */
export function resolveSlugCollisions<T extends SluggableRecord>(records: T[]) {
  const seen = new Map<string, number>()

  return records.map((record) => {
    const base = derivePackageSlug(record)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)

    return { ...record, slug: count === 0 ? base : `${base}-${count + 1}` }
  })
}

export function findPackageBySlug<T extends SluggableRecord>(records: T[], slug: string) {
  const withSlugs = resolveSlugCollisions(records)
  const bySlug = withSlugs.find((record) => record.slug === slug)
  if (bySlug) return bySlug

  // Fall back to the stored id so links shared before a rename still resolve.
  return withSlugs.find((record) => record.id === slug)
}

export function buildPackageHref(category: PackageCategory, slug: string) {
  return `/packages/${category}/${slug}`
}
