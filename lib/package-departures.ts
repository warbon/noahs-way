import { addDays, isDateString } from "@/lib/stay-availability"

/**
 * One departure of a package: a fixed window the tour runs, priced per person
 * as the package's base price plus an optional surcharge.
 *
 * Structured successor to `travelPeriods`, which holds the windows as printed
 * on the poster ("Apr 30–May 03 (+₱5,000/pax)") with no year and no way to say
 * a window is full. Packages that have only the strings keep showing them, and
 * their booking form keeps asking for free dates; nothing is migrated in place.
 */
export type PackageDeparture = {
  /** Generated once when the row is created and kept across edits, so an inquiry can name it. */
  id: string
  /** `YYYY-MM-DD`, Manila local: the day the group leaves. */
  startDate: string
  /** `YYYY-MM-DD`, inclusive: the day the group is back. */
  endDate: string
  /** Added to the package's base price, per person. Absent means none. */
  surchargePerPax?: number
  /** Set by an admin when the operator says the departure is full. */
  soldOut?: boolean
}

type DepartureSource = {
  departures?: PackageDeparture[]
  travelPeriods?: string[]
}

/**
 * Dispatched on the package form by the poster reader with the windows it read
 * (`detail: string[]`). The departure editor keeps its rows in React state,
 * which the reader's direct writes to form inputs cannot reach.
 */
export const POSTER_TRAVEL_PERIODS_EVENT = "poster:travel-periods"

export const MAX_DEPARTURES = 200
const MAX_SURCHARGE = 10_000_000
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function createDepartureId() {
  return `dep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** One row from storage or a request, or null when it cannot describe a real departure. */
export function normalizeDeparture(raw: unknown): PackageDeparture | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>

  if (!isDateString(record.startDate) || !isDateString(record.endDate)) return null
  if (record.endDate < record.startDate) return null

  const id = typeof record.id === "string" && ID_PATTERN.test(record.id) ? record.id : createDepartureId()

  const surcharge =
    typeof record.surchargePerPax === "number" && Number.isFinite(record.surchargePerPax)
      ? Math.round(record.surchargePerPax)
      : undefined

  return {
    id,
    startDate: record.startDate,
    endDate: record.endDate,
    ...(surcharge && surcharge > 0 && surcharge <= MAX_SURCHARGE ? { surchargePerPax: surcharge } : {}),
    ...(record.soldOut === true ? { soldOut: true } : {})
  }
}

/**
 * Validates, sorts by departure date and keeps ids unique.
 *
 * A repeated id gets a fresh one rather than dropping the row: losing a
 * departure an admin typed in is worse than re-identifying it, and a duplicate
 * can only come from a hand-crafted request.
 */
export function normalizeDepartures(raw: unknown): PackageDeparture[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const departures: PackageDeparture[] = []
  for (const entry of raw.slice(0, MAX_DEPARTURES)) {
    const departure = normalizeDeparture(entry)
    if (!departure) continue
    if (seen.has(departure.id)) departure.id = createDepartureId()
    seen.add(departure.id)
    departures.push(departure)
  }

  return departures.sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)
  )
}

/** Departures that have not left yet, soonest first. One leaving today still counts. */
export function upcomingDepartures(
  departures: PackageDeparture[] | undefined,
  today: string
): PackageDeparture[] {
  return (departures ?? []).filter((departure) => departure.startDate >= today)
}

/** Upcoming and not sold out: the ones a customer can actually pick. */
export function bookableDepartures(
  departures: PackageDeparture[] | undefined,
  today: string
): PackageDeparture[] {
  return upcomingDepartures(departures, today).filter((departure) => !departure.soldOut)
}

export type DepartureSelection =
  | { ok: true; departure: PackageDeparture }
  | { ok: false; reason: "missing" | "unknown" | "sold-out" | "past"; error: string }

/**
 * The one rule for "may this departure be requested right now", used by every
 * path that files an inquiry. Callers pass the package as it is stored now, not
 * as the customer's browser last saw it.
 */
export function resolveDepartureSelection(
  departures: PackageDeparture[] | undefined,
  departureId: unknown,
  today: string
): DepartureSelection {
  if (typeof departureId !== "string" || !departureId) {
    return { ok: false, reason: "missing", error: "Please choose one of this package's travel periods." }
  }

  const departure = (departures ?? []).find((entry) => entry.id === departureId)
  if (!departure) {
    return {
      ok: false,
      reason: "unknown",
      error: "That travel period is no longer offered. Please choose another one."
    }
  }

  if (departure.startDate < today) {
    return { ok: false, reason: "past", error: "That travel period has already departed. Please choose another one." }
  }

  if (departure.soldOut) {
    return {
      ok: false,
      reason: "sold-out",
      error: `${formatDepartureRange(departure)} just sold out. Please choose another travel period.`
    }
  }

  return { ok: true, departure }
}

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  return { year, month, day }
}

/** "Oct 26–31, 2026", "Oct 27–Nov 1, 2026" or "Dec 28, 2026–Jan 2, 2027". */
export function formatDepartureRange(departure: Pick<PackageDeparture, "startDate" | "endDate">) {
  const start = parts(departure.startDate)
  const end = parts(departure.endDate)
  const startMonth = MONTHS_SHORT[start.month - 1]
  const endMonth = MONTHS_SHORT[end.month - 1]

  if (start.year !== end.year) {
    return `${startMonth} ${start.day}, ${start.year}–${endMonth} ${end.day}, ${end.year}`
  }
  if (start.month !== end.month) {
    return `${startMonth} ${start.day}–${endMonth} ${end.day}, ${end.year}`
  }
  if (start.day !== end.day) {
    return `${startMonth} ${start.day}–${end.day}, ${end.year}`
  }
  return `${startMonth} ${start.day}, ${end.year}`
}

/** "Oct 26–31", without the year: for bars and chips where the month is already on screen. */
export function formatDepartureShort(departure: Pick<PackageDeparture, "startDate" | "endDate">) {
  return formatDepartureRange(departure).replace(/,\s*\d{4}/g, "")
}

/** "Mon, Oct 26", for spelling the two ends out. */
export function formatDepartureDay(date: string) {
  const { year, month, day } = parts(date)
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()]
  return `${weekday}, ${MONTHS_SHORT[month - 1]} ${day}`
}

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`
}

/** "Oct 26–31, 2026 (+₱3,000/pax)" — the line stored on an inquiry and shown to consultants. */
export function formatDepartureLabel(departure: PackageDeparture) {
  const range = formatDepartureRange(departure)
  return departure.surchargePerPax ? `${range} (+${formatPeso(departure.surchargePerPax)}/pax)` : range
}

/** Base price plus surcharge, or undefined when the package has no numeric price. */
export function departurePrice(basePrice: number | undefined, departure: PackageDeparture) {
  return typeof basePrice === "number" ? basePrice + (departure.surchargePerPax ?? 0) : undefined
}

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
}

const LEGACY_PERIOD = /^\s*([A-Za-z]{3,9})\.?\s*(\d{1,2})\s*[–—-]\s*(?:([A-Za-z]{3,9})\.?\s*)?(\d{1,2})\b(.*)$/
const LEGACY_SURCHARGE = /\+\s*(?:₱|PHP|Php|P)\s*([\d,]+)/

export type ParsedLegacyPeriod = Omit<PackageDeparture, "id">

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * Reads one poster-style window: "Jan 16–20", "Apr 30–May 03 (+₱5,000/pax)",
 * "Sept 08–13". The strings carry no year, so the year comes from
 * `referenceDate` (when the package was last edited) and the admin is asked to
 * check it; a window whose end month comes before its start month rolls into
 * the next year. Returns null for anything it cannot read with confidence.
 */
export function parseLegacyTravelPeriod(text: string, referenceDate: string): ParsedLegacyPeriod | null {
  const match = LEGACY_PERIOD.exec(text)
  if (!match || !isDateString(referenceDate)) return null

  const [, startMonthName, startDayText, endMonthName, endDayText, rest] = match
  const startMonth = MONTH_NUMBERS[startMonthName.toLowerCase()]
  const endMonth = endMonthName ? MONTH_NUMBERS[endMonthName.toLowerCase()] : startMonth
  if (!startMonth || !endMonth) return null

  const startDay = Number(startDayText)
  const endDay = Number(endDayText)
  // "Mar 30–02" could mean April 2nd or a typo; guessing would put a wrong
  // window in front of customers, so the admin enters it by hand.
  if (endMonth === startMonth && endDay < startDay) return null

  const startYear = parts(referenceDate).year
  const endYear = endMonth < startMonth ? startYear + 1 : startYear
  const startDate = isoDate(startYear, startMonth, startDay)
  const endDate = isoDate(endYear, endMonth, endDay)
  if (!isDateString(startDate) || !isDateString(endDate)) return null

  const surchargeMatch = LEGACY_SURCHARGE.exec(rest)
  const surcharge = surchargeMatch ? Number(surchargeMatch[1].replace(/,/g, "")) : 0

  return {
    startDate,
    endDate,
    ...(surcharge > 0 ? { surchargePerPax: surcharge } : {})
  }
}

/** True when the package has moved to structured departures, whatever their dates. */
export function usesStructuredDepartures(pkg: DepartureSource) {
  return Array.isArray(pkg.departures) && pkg.departures.length > 0
}

/**
 * Travel dates as lines of text, for places that list rather than pick: the
 * Facebook caption. Structured departures show upcoming ones only, sold-out
 * ones marked; legacy packages show their strings as before.
 */
export function departureDisplayList(pkg: DepartureSource, today: string): string[] {
  if (usesStructuredDepartures(pkg)) {
    return upcomingDepartures(pkg.departures, today).map((departure) =>
      departure.soldOut ? `${formatDepartureRange(departure)} — SOLD OUT` : formatDepartureLabel(departure)
    )
  }
  return pkg.travelPeriods ?? []
}

/** Departures a customer could still book, or the legacy count for packages without any. */
export function countOpenDepartures(pkg: DepartureSource, today: string) {
  return usesStructuredDepartures(pkg)
    ? bookableDepartures(pkg.departures, today).length
    : (pkg.travelPeriods?.length ?? 0)
}

/** End date that matches the package's length: a 5-day tour leaving the 26th is back on the 30th. */
export function defaultEndDate(startDate: string, durationDays: number | undefined) {
  if (!isDateString(startDate)) return ""
  return addDays(startDate, Math.max((durationDays ?? 1) - 1, 0))
}
