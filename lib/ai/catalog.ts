import type { ChatPackageSummary } from "@/lib/ai/genui-types"
import type { PackageCategory } from "@/lib/package-data"
import { getPackagesByCategory, type PackageRecord } from "@/lib/package-repository"
import { buildPackageHref, resolveSlugCollisions } from "@/lib/package-slug"
import { formatDuration, formatPackagePrice, parseDurationFromDetails } from "@/lib/price"

const CATEGORIES: PackageCategory[] = ["local", "international"]

export type CatalogEntry = PackageRecord & { slug: string }

/**
 * Loads both categories with collision-resolved slugs, exactly as the storefront
 * does, so a link the assistant hands out resolves to the same page a visitor
 * would reach by browsing. Drafts are excluded — the assistant must never offer
 * something the public site does not show.
 */
export async function loadPublishedCatalog(): Promise<CatalogEntry[]> {
  const perCategory = await Promise.all(
    CATEGORIES.map(async (category) => {
      const records = await getPackagesByCategory(category)
      return resolveSlugCollisions(records) as CatalogEntry[]
    })
  )

  return perCategory.flat()
}

export async function findCatalogEntry(packageId: string): Promise<CatalogEntry | undefined> {
  const catalog = await loadPublishedCatalog()
  return catalog.find((entry) => entry.id === packageId)
}

function durationOf(entry: CatalogEntry) {
  const parsed = parseDurationFromDetails(entry.details)
  return {
    days: entry.durationDays ?? parsed.durationDays,
    nights: entry.durationNights ?? parsed.durationNights
  }
}

/** The trusted render payload for a package card. */
export function toChatPackageSummary(entry: CatalogEntry): ChatPackageSummary {
  const { days, nights } = durationOf(entry)

  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    slug: entry.slug,
    href: buildPackageHref(entry.category, entry.slug),
    destination: entry.destination,
    summary: entry.summary,
    priceLabel: formatPackagePrice(entry),
    durationLabel: formatDuration(days, nights),
    previewImage: entry.previewImage || entry.imagePath,
    imageAlt: entry.imageAlt || entry.title
  }
}

/** Compact shape handed to the model. Deliberately smaller than the render payload. */
export function toModelPackage(entry: CatalogEntry) {
  const { days, nights } = durationOf(entry)

  return {
    packageId: entry.id,
    title: entry.title,
    category: entry.category,
    destination: entry.destination,
    summary: entry.summary ?? entry.details,
    price: formatPackagePrice(entry),
    priceAmount: entry.priceAmount,
    currency: entry.currency ?? "PHP",
    durationDays: days,
    durationNights: nights,
    href: buildPackageHref(entry.category, entry.slug)
  }
}

export function matchesQuery(entry: CatalogEntry, query: string) {
  const haystack = [
    entry.title,
    entry.destination,
    entry.summary,
    entry.details,
    ...(entry.highlights ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  // Every whitespace-separated term must appear somewhere. "korea 5 day" then
  // narrows rather than widening the way an OR match would.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}
