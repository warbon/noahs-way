import type { ChatStaySummary } from "@/lib/ai/genui-types"
import { formatPricePHP } from "@/lib/price"
import { normalizeBlocks, todayInManila } from "@/lib/stay-availability"
import { getStays } from "@/lib/stay-repository"
import type { StayRecord } from "@/lib/stay-repository-types"
import { buildStayHref, resolveStaySlugs } from "@/lib/stay-slug"

export type StayCatalogEntry = StayRecord & { slug: string }

/**
 * Loads published units with collision-resolved slugs, exactly as the
 * storefront does, so a link the assistant hands out resolves to the same page
 * a guest would reach by browsing. Drafts are excluded — the assistant must
 * never offer something the public site does not show.
 */
export async function loadPublishedStays(): Promise<StayCatalogEntry[]> {
  return resolveStaySlugs(await getStays()) as StayCatalogEntry[]
}

export async function findStayEntry(stayId: string): Promise<StayCatalogEntry | undefined> {
  const stays = await loadPublishedStays()
  return stays.find((entry) => entry.id === stayId)
}

function layoutOf(entry: StayCatalogEntry) {
  return entry.bedrooms === 0 ? "Studio" : `${entry.bedrooms}BR`
}

/** The trusted render payload for a stay card. */
export function toChatStaySummary(entry: StayCatalogEntry): ChatStaySummary {
  return {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    href: buildStayHref(entry.slug),
    city: entry.city,
    building: entry.building,
    summary: entry.summary ?? entry.details,
    rateLabel: `${formatPricePHP(entry.nightlyRate, entry.currency ?? "PHP")} / night`,
    layoutLabel: `${layoutOf(entry)} · Sleeps ${entry.maxGuests}`,
    previewImage: entry.previewImage || entry.imagePath,
    imageAlt: entry.imageAlt || entry.title
  }
}

/**
 * Compact shape handed to the model. Deliberately smaller than the render
 * payload, and deliberately without the blocked-date list: a model given raw
 * ranges will start doing calendar arithmetic in prose. Availability is
 * answered by `check_stay_availability`, which computes it.
 */
export function toModelStay(entry: StayCatalogEntry) {
  const today = todayInManila()
  const upcomingBlocks = normalizeBlocks(entry.blocks).filter((block) => block.to > today)

  return {
    stayId: entry.id,
    title: entry.title,
    city: entry.city,
    building: entry.building,
    landmark: entry.landmark,
    summary: entry.summary ?? entry.details,
    nightlyRate: entry.nightlyRate,
    currency: entry.currency ?? "PHP",
    cleaningFee: entry.cleaningFee,
    minimumNights: entry.minimumNights ?? 1,
    bedrooms: entry.bedrooms,
    layout: layoutOf(entry),
    maxGuests: entry.maxGuests,
    amenities: entry.amenities,
    href: buildStayHref(entry.slug),
    hasBlockedDates: upcomingBlocks.length > 0,
    /**
     * Surfaced so the assistant can say how current the calendar is. A unit
     * whose availability was last touched weeks ago is worth a consultant
     * check before anyone plans around it.
     */
    availabilityUpdatedAt: entry.availabilityUpdatedAt?.slice(0, 10)
  }
}

export function matchesStayQuery(entry: StayCatalogEntry, query: string) {
  const haystack = [
    entry.title,
    entry.city,
    entry.building,
    entry.landmark,
    entry.summary,
    entry.details,
    ...(entry.amenities ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  // Every whitespace-separated term must appear somewhere, matching the
  // package search's behaviour: "cebu studio" narrows rather than widens.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}
