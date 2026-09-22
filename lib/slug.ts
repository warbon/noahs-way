/**
 * Slug helpers shared by every catalog on the site.
 *
 * Lifted out of `package-slug.ts` when condo stays arrived and needed the same
 * behaviour. The algorithm is the load-bearing part: ids, public URLs, the seed
 * script and the sitemap all have to agree on what a title slugs to, or a link
 * that was shared yesterday stops resolving.
 */

export function slugifyTitle(title: string, fallback = "item") {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  )
}

export type SluggableRecord = { title: string; slug?: string; id?: string }

export function deriveSlug(record: SluggableRecord, fallback = "item") {
  return record.slug?.trim() || slugifyTitle(record.title, fallback)
}

/**
 * Assigns a stable, unique slug to every record in a list. Later duplicates get
 * a `-2`, `-3` suffix in array order so the result is deterministic.
 */
export function resolveSlugCollisions<T extends SluggableRecord>(records: T[], fallback = "item") {
  const seen = new Map<string, number>()

  return records.map((record) => {
    const base = deriveSlug(record, fallback)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)

    return { ...record, slug: count === 0 ? base : `${base}-${count + 1}` }
  })
}

export function findBySlug<T extends SluggableRecord>(records: T[], slug: string, fallback = "item") {
  const withSlugs = resolveSlugCollisions(records, fallback)
  const bySlug = withSlugs.find((record) => record.slug === slug)
  if (bySlug) return bySlug

  // Fall back to the stored id so links shared before a rename still resolve.
  return withSlugs.find((record) => record.id === slug)
}
