import type { AvailabilityBlock } from "@/lib/stay-data"

/**
 * Date handling for stays.
 *
 * Every date here is a plain `YYYY-MM-DD` string in Philippine local time, and
 * every comparison is a string comparison. That is deliberate: `YYYY-MM-DD`
 * sorts lexicographically in the same order it sorts chronologically, so no
 * `Date` object ever needs to exist to answer "is this night before that one".
 *
 * The only place a `Date` appears is `addDays`, which anchors at 12:00 UTC.
 * Anchoring at midnight would put the instant within 8 hours of the Philippine
 * date boundary, where a stray timezone conversion silently shifts the day.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Philippine Standard Time, fixed offset, no daylight saving. */
const MANILA_TIME_ZONE = "Asia/Manila"

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false

  // Rejects 2026-02-31 and friends: the round trip only survives a real date.
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Today's calendar date in Manila, regardless of where the server runs.
 *
 * `en-CA` is used purely because its short date format is `YYYY-MM-DD`.
 */
export function todayInManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date())
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12))
  return shifted.toISOString().slice(0, 10)
}

/** Nights between two dates. Check-out day is not a night. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number)
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number)
  const start = Date.UTC(inYear, inMonth - 1, inDay, 12)
  const end = Date.UTC(outYear, outMonth - 1, outDay, 12)
  return Math.round((end - start) / 86_400_000)
}

/** Every night actually slept, so check-out is excluded. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = []
  for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
    nights.push(date)
  }
  return nights
}

/**
 * Drops malformed and zero-length ranges, sorts, then merges anything that
 * touches or overlaps.
 *
 * Merging matters beyond tidiness: two adjacent bookings stored separately
 * would otherwise render as two separate blocks with a phantom gap between
 * them in a naive calendar.
 */
export function normalizeBlocks(blocks: AvailabilityBlock[] | undefined): AvailabilityBlock[] {
  if (!blocks?.length) return []

  const valid = blocks
    .filter((block) => isDateString(block.from) && isDateString(block.to) && block.from < block.to)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))

  const merged: AvailabilityBlock[] = []
  for (const block of valid) {
    const previous = merged[merged.length - 1]

    // `<=` rather than `<`: a block ending the day the next begins is one
    // continuous unavailable stretch, not two.
    if (previous && block.from <= previous.to) {
      if (block.to > previous.to) previous.to = block.to
      // The merged range covers both reasons, so neither note describes it any
      // more. Admins read the unmerged list in the editor.
      if (previous.note && block.note && previous.note !== block.note) {
        previous.note = undefined
      }
      continue
    }

    merged.push({ ...block })
  }

  return merged
}

export function isNightBlocked(night: string, blocks: AvailabilityBlock[] | undefined): boolean {
  return normalizeBlocks(blocks).some((block) => night >= block.from && night < block.to)
}

/** True when every night in `[checkIn, checkOut)` is free. */
export function isRangeAvailable(
  checkIn: string,
  checkOut: string,
  blocks: AvailabilityBlock[] | undefined
): boolean {
  const normalized = normalizeBlocks(blocks)
  if (!normalized.length) return true

  return !normalized.some((block) => checkIn < block.to && checkOut > block.from)
}

/** The blocked nights within a window, for painting a calendar. */
export function blockedNightsBetween(
  from: string,
  to: string,
  blocks: AvailabilityBlock[] | undefined
): Set<string> {
  const normalized = normalizeBlocks(blocks)
  const nights = new Set<string>()

  for (const block of normalized) {
    const start = block.from > from ? block.from : from
    const end = block.to < to ? block.to : to
    for (const night of eachNight(start, end)) nights.add(night)
  }

  return nights
}

export type StayRangeCheck =
  | { ok: true; nights: number }
  | { ok: false; error: string }

/**
 * The single validator for a requested stay, run on the client for immediate
 * feedback and again on the server before an inquiry is stored.
 *
 * The server run is the one that counts. A calendar rendered minutes ago is a
 * hint; between the render and the submit another guest may have been booked
 * in, so the check has to happen against the catalog at submit time.
 */
export function checkStayRange(
  checkIn: unknown,
  checkOut: unknown,
  unit: { minimumNights?: number; blocks?: AvailabilityBlock[] },
  today = todayInManila()
): StayRangeCheck {
  if (!isDateString(checkIn) || !isDateString(checkOut)) {
    return { ok: false, error: "Enter a check-in and check-out date." }
  }

  if (checkOut <= checkIn) {
    return { ok: false, error: "Check-out has to be after check-in." }
  }

  if (checkIn < today) {
    return { ok: false, error: "Check-in cannot be in the past." }
  }

  const nights = nightsBetween(checkIn, checkOut)
  const minimum = unit.minimumNights ?? 1

  if (nights < minimum) {
    return {
      ok: false,
      error: `This unit takes bookings of ${minimum} night${minimum === 1 ? "" : "s"} or more.`
    }
  }

  if (!isRangeAvailable(checkIn, checkOut, unit.blocks)) {
    return { ok: false, error: "Those dates are already taken. Try a different window." }
  }

  return { ok: true, nights }
}

export type StayQuote = {
  nights: number
  nightlyRate: number
  accommodation: number
  cleaningFee: number
  total: number
  currency: string
}

/**
 * What the stay costs, given a length.
 *
 * The cleaning fee is per booking rather than per night, which is why it is
 * shown as its own line: folded into a nightly average it makes a two-night
 * stay look overpriced against a week.
 */
export function quoteStay(
  unit: { nightlyRate: number; cleaningFee?: number; currency?: string },
  nights: number
): StayQuote {
  const accommodation = unit.nightlyRate * nights
  const cleaningFee = unit.cleaningFee ?? 0

  return {
    nights,
    nightlyRate: unit.nightlyRate,
    accommodation,
    cleaningFee,
    total: accommodation + cleaningFee,
    currency: unit.currency ?? "PHP"
  }
}

/** "Fri, Mar 13, 2026" — month-first, which is the usual Philippine order. */
export function formatStayDate(date: string): string {
  if (!isDateString(date)) return date
  const [year, month, day] = date.split("-").map(Number)
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}
