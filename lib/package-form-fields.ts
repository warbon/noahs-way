import type { ItineraryDay, PackageStatus, TravelPackage } from "@/lib/package-data"

/** One item per line, blank lines dropped. */
export function parseLines(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined
  const items = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

/**
 * Itinerary entered as plain text, one day per line:
 *   Day 1 | Arrival in Incheon | Airport pickup; hotel check-in
 * Keeps the admin form simple while still producing structured data.
 */
export function parseItinerary(value: unknown): ItineraryDay[] | undefined {
  const lines = parseLines(value)
  if (!lines) return undefined

  const days = lines.map((line, index) => {
    const [dayPart, titlePart, activitiesPart] = line.split("|").map((part) => part.trim())
    const dayNumber = Number.parseInt(dayPart?.replace(/[^\d]/g, "") ?? "", 10)

    return {
      day: Number.isFinite(dayNumber) ? dayNumber : index + 1,
      title: titlePart || dayPart || `Day ${index + 1}`,
      activities: activitiesPart
        ? activitiesPart.split(";").map((a) => a.trim()).filter(Boolean)
        : undefined
    } satisfies ItineraryDay
  })

  return days.length > 0 ? days : undefined
}

export function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined
  const parsed = Number.parseFloat(value.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

export function parseOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().replace(/\s+/g, " ")
  return trimmed || undefined
}

export function parseStatus(value: unknown): PackageStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined
}

type StructuredFields = Pick<
  TravelPackage,
  | "status"
  | "destination"
  | "summary"
  | "priceAmount"
  | "currency"
  | "durationDays"
  | "durationNights"
  | "highlights"
  | "itinerary"
  | "inclusions"
  | "exclusions"
  | "imageAlt"
>

/**
 * Reads the optional structured fields off a submitted form.
 *
 * By default a missing or blank field is omitted, so a form that doesn't carry
 * these inputs can't wipe stored values. When the form sends
 * `manageStructured=1` it is declaring that it rendered all of them, so a blank
 * field means "clear this" — otherwise an admin could never remove an itinerary
 * once one had been saved.
 */
export function readStructuredFields(formData: FormData): StructuredFields {
  const managesAll = formData.get("manageStructured") === "1"

  const fields: StructuredFields = {
    status: parseStatus(formData.get("status")),
    destination: parseOptionalText(formData.get("destination")),
    summary: parseOptionalText(formData.get("summary")),
    priceAmount: parseOptionalNumber(formData.get("priceAmount")),
    currency: parseOptionalText(formData.get("currency")) ?? undefined,
    durationDays: parseOptionalNumber(formData.get("durationDays")),
    durationNights: parseOptionalNumber(formData.get("durationNights")),
    highlights: parseLines(formData.get("highlights")),
    itinerary: parseItinerary(formData.get("itinerary")),
    inclusions: parseLines(formData.get("inclusions")),
    exclusions: parseLines(formData.get("exclusions")),
    imageAlt: parseOptionalText(formData.get("imageAlt"))
  }

  // `status` is a select that always submits, so it is never a "clear".
  if (managesAll) {
    return Object.fromEntries(
      Object.entries(fields).filter(([key]) => key !== "status" || fields.status !== undefined)
    ) as StructuredFields
  }

  // Drop undefined keys so partial updates don't clobber stored values.
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  ) as StructuredFields
}
