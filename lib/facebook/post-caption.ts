import type { PackageRecord } from "@/lib/package-repository-types"
import { formatDuration, formatPackagePrice } from "@/lib/price"
import { siteConfig } from "@/lib/site-config"

/**
 * Turns a stored package into the text of a Facebook post.
 *
 * The shape is the one a travel page actually posts in — headline, the two
 * facts a buyer scans for (where and how much), then the detail — rather than a
 * dump of every stored field. Lists are capped because a caption is collapsed
 * behind "See more" after a few lines, and everything past that point is read
 * on the package page, not here.
 */

/** Facebook's own limit is far higher; this is where a caption stops being read. */
const MAX_CAPTION_LENGTH = 4000

const MAX_HIGHLIGHTS = 5
const MAX_INCLUSIONS = 6
const MAX_TRAVEL_PERIODS = 4

function bulletList(items: string[] | undefined, limit: number) {
  if (!items || items.length === 0) return null

  // One item over the cap is printed rather than summarised: "…and 1 more" is
  // longer than the line it replaces and tells the reader nothing.
  if (items.length <= limit + 1) return items.map((item) => `• ${item}`).join("\n")

  const shown = items.slice(0, limit).map((item) => `• ${item}`)
  shown.push(`• …and ${items.length - limit} more`)

  return shown.join("\n")
}

/**
 * Normalises whatever an admin typed into hashtags Facebook will link.
 *
 * Accepts "#NoahsWay #Cebu", "NoahsWay, Cebu" or a mix — the field is free text
 * in the panel, so the parsing is done here rather than trusted at the edge.
 */
export function formatHashtags(value: string | null | undefined) {
  if (!value) return null

  const seen = new Set<string>()
  const tags: string[] = []

  for (const raw of value.split(/[\s,]+/)) {
    const tag = raw.replace(/^#+/, "").replace(/[^A-Za-z0-9_]/g, "")
    if (!tag) continue

    // Facebook treats #Cebu and #cebu as one tag, so listing both just wastes
    // caption space. First spelling wins.
    const key = tag.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    tags.push(`#${tag}`)
  }

  return tags.length > 0 ? tags.join(" ") : null
}

export type PackageCaptionOptions = {
  /** Absolute URL of the package page — the one thing the post has to carry. */
  packageUrl: string
  hashtags?: string | null
}

export function buildPackageCaption(
  pkg: PackageRecord,
  { packageUrl, hashtags }: PackageCaptionOptions
) {
  const duration = formatDuration(pkg.durationDays, pkg.durationNights)
  const whereAndHowLong = [pkg.destination, duration].filter(Boolean).join(" · ")

  const sections: (string | null)[] = [
    `🌏 ${pkg.title}`,
    whereAndHowLong ? `📍 ${whereAndHowLong}` : null,
    `💸 ${formatPackagePrice(pkg)}`,
    "",
    // `details` is the one-line teaser every record has; `summary` is the fuller
    // paragraph only edited records carry, so it wins when present.
    pkg.summary?.trim() || pkg.details?.trim() || null
  ]

  const highlights = bulletList(pkg.highlights, MAX_HIGHLIGHTS)
  if (highlights) sections.push("", "✨ Highlights", highlights)

  const travelPeriods = bulletList(pkg.travelPeriods, MAX_TRAVEL_PERIODS)
  if (travelPeriods) sections.push("", "📅 Travel dates", travelPeriods)

  const inclusions = bulletList(pkg.inclusions, MAX_INCLUSIONS)
  if (inclusions) sections.push("", "✅ Inclusions", inclusions)

  sections.push(
    "",
    `📩 Full itinerary and booking: ${packageUrl}`,
    `📞 ${siteConfig.phone}`
  )

  const tags = formatHashtags(hashtags)
  if (tags) sections.push("", tags)

  const caption = sections
    .filter((section) => section !== null)
    .join("\n")
    // Collapse the blank-line runs that optional sections leave behind.
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (caption.length <= MAX_CAPTION_LENGTH) return caption

  // Truncating mid-word is ugly, but losing the booking link would defeat the
  // post, so the link is re-appended after the cut.
  const room = MAX_CAPTION_LENGTH - packageUrl.length - 4
  return `${caption.slice(0, room).trimEnd()}…\n${packageUrl}`
}
