import { addDays, nightsBetween } from "@/lib/stay-availability"

/**
 * Month-grid arithmetic shared by the condo availability calendar and the
 * package travel-period calendar, so the two cannot drift into disagreeing
 * about which weekday the 1st falls on.
 *
 * Same rule as lib/stay-availability.ts: every date is a `YYYY-MM-DD` string
 * and any `Date` is anchored at 12:00 UTC, well clear of the Manila midnight.
 */

/** Sunday first, the usual Philippine wall-calendar order. */
export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

/** First of the month containing `date`. */
export function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`
}

export function addMonths(monthFirst: string, count: number) {
  const [year, month] = monthFirst.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + count, 1, 12))
  return shifted.toISOString().slice(0, 10)
}

export function monthLabel(monthFirst: string) {
  const [year, month] = monthFirst.split("-").map(Number)
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

function weekdayOf(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}

function daysInMonth(monthFirst: string) {
  const [year, month] = monthFirst.split("-").map(Number)
  return new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
}

/**
 * The days of one month, padded at the front with nulls so the 1st lands under
 * the right weekday.
 */
export function monthCells(monthFirst: string): (string | null)[] {
  const prefix = monthFirst.slice(0, 7)
  return [
    ...Array.from({ length: weekdayOf(monthFirst) }, () => null),
    ...Array.from(
      { length: daysInMonth(monthFirst) },
      (_, index) => `${prefix}-${String(index + 1).padStart(2, "0")}`
    )
  ]
}

/**
 * The Sunday of every week that shows part of the month — four to six of them.
 * Unlike `monthCells`, the weeks run whole: a week straddling two months shows
 * the neighbouring month's days too, because a trip drawn across that week
 * would otherwise stop at an invisible wall.
 */
export function monthWeekStarts(monthFirst: string): string[] {
  const lead = weekdayOf(monthFirst)
  const weeks = Math.ceil((lead + daysInMonth(monthFirst)) / 7)
  const first = addDays(monthFirst, -lead)
  return Array.from({ length: weeks }, (_, index) => addDays(first, index * 7))
}

export type CalendarRange = { startDate: string; endDate: string }

export type WeekSegment<T extends CalendarRange> = {
  item: T
  /** 1-based grid column; Sunday is 1. */
  column: number
  /** Days covered in this week, 1–7. */
  span: number
  /** 0-based row within the week, so overlapping ranges stack instead of colliding. */
  lane: number
  /** The range begins in this week, as opposed to carrying over from the last. */
  startsHere: boolean
  /** The range carries on into the next week. */
  continues: boolean
}

/**
 * Lays out the ranges that touch one week as horizontal bars, the way a
 * calendar app draws multi-day events.
 *
 * Both ends are inclusive: a trip from the 26th to the 31st covers six cells.
 * Lanes are handed out greedily, earliest and then longest first, so three
 * departures a day apart take three rows, keep them into the next week, and a
 * back-to-back pair shares one.
 */
export function weekSegments<T extends CalendarRange>(
  items: readonly T[],
  weekStart: string
): { segments: WeekSegment<T>[]; laneCount: number } {
  const weekEnd = addDays(weekStart, 6)

  const segments = items
    .filter((item) => item.startDate <= weekEnd && item.endDate >= weekStart)
    .map((item) => {
      const from = item.startDate > weekStart ? item.startDate : weekStart
      const to = item.endDate < weekEnd ? item.endDate : weekEnd
      return {
        item,
        // nightsBetween is plain day arithmetic; a calendar column is a day.
        column: nightsBetween(weekStart, from) + 1,
        span: nightsBetween(from, to) + 1,
        lane: 0,
        startsHere: from === item.startDate,
        continues: to !== item.endDate
      }
    })
    // Earlier-starting ranges first, so trips carried over from last week land
    // in the same order they had there instead of swapping rows mid-trip.
    .sort(
      (a, b) =>
        a.column - b.column || a.item.startDate.localeCompare(b.item.startDate) || b.span - a.span
    )

  const laneEnds: number[] = []
  for (const segment of segments) {
    let lane = laneEnds.findIndex((lastColumn) => lastColumn < segment.column)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[lane] = segment.column + segment.span - 1
    segment.lane = lane
  }

  return { segments, laneCount: laneEnds.length }
}
