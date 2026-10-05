import assert from "node:assert/strict"
import test from "node:test"

import {
  bookableDepartures,
  countOpenDepartures,
  defaultEndDate,
  departureDisplayList,
  formatDepartureLabel,
  formatDepartureRange,
  normalizeDepartures,
  parseLegacyTravelPeriod,
  resolveDepartureSelection,
  upcomingDepartures
} from "../lib/package-departures.ts"

const REFERENCE = "2026-08-22"

test("legacy poster strings parse into dated windows", () => {
  assert.deepEqual(parseLegacyTravelPeriod("Jan 16–20", REFERENCE), {
    startDate: "2026-01-16",
    endDate: "2026-01-20"
  })
  assert.deepEqual(parseLegacyTravelPeriod("Apr 30–May 03 (+₱5,000/pax)", REFERENCE), {
    startDate: "2026-04-30",
    endDate: "2026-05-03",
    surchargePerPax: 5000
  })
  assert.deepEqual(parseLegacyTravelPeriod("Oct 27–Nov 01 (+₱5,000/pax)", REFERENCE), {
    startDate: "2026-10-27",
    endDate: "2026-11-01",
    surchargePerPax: 5000
  })
  assert.deepEqual(parseLegacyTravelPeriod("Sept 08–13 (+₱6,000/pax)", REFERENCE), {
    startDate: "2026-09-08",
    endDate: "2026-09-13",
    surchargePerPax: 6000
  })
  assert.deepEqual(parseLegacyTravelPeriod("Mar 04-08", REFERENCE), {
    startDate: "2026-03-04",
    endDate: "2026-03-08"
  })
})

test("a window crossing New Year rolls its end into the next year", () => {
  assert.deepEqual(parseLegacyTravelPeriod("Dec 28–Jan 02", REFERENCE), {
    startDate: "2026-12-28",
    endDate: "2027-01-02"
  })
})

test("unreadable or ambiguous legacy strings are refused rather than guessed", () => {
  assert.equal(parseLegacyTravelPeriod("Every Friday", REFERENCE), null)
  assert.equal(parseLegacyTravelPeriod("Foo 03–08", REFERENCE), null)
  assert.equal(parseLegacyTravelPeriod("Mar 30–02", REFERENCE), null)
  assert.equal(parseLegacyTravelPeriod("Feb 30–31", REFERENCE), null)
})

test("normalizing drops invalid rows, sorts, and keeps ids unique", () => {
  const departures = normalizeDepartures([
    { id: "b", startDate: "2026-11-01", endDate: "2026-11-06", surchargePerPax: 5000 },
    { id: "a", startDate: "2026-10-14", endDate: "2026-10-19", soldOut: true },
    { id: "a", startDate: "2026-10-15", endDate: "2026-10-20" },
    { id: "c", startDate: "2026-10-20", endDate: "2026-10-18" },
    { id: "d", startDate: "2026-02-31", endDate: "2026-03-02" },
    { id: "e", startDate: "2026-12-01", endDate: "2026-12-05", surchargePerPax: -100 },
    "not a departure"
  ])

  assert.deepEqual(
    departures.map((departure) => departure.startDate),
    ["2026-10-14", "2026-10-15", "2026-11-01", "2026-12-01"]
  )
  assert.equal(new Set(departures.map((departure) => departure.id)).size, 4)
  assert.equal(departures[0].soldOut, true)
  assert.equal(departures[1].soldOut, undefined)
  assert.equal(departures[3].surchargePerPax, undefined)
})

const catalog = normalizeDepartures([
  { id: "past", startDate: "2026-10-01", endDate: "2026-10-06" },
  { id: "today", startDate: "2026-10-05", endDate: "2026-10-10" },
  { id: "full", startDate: "2026-10-16", endDate: "2026-10-21", soldOut: true },
  { id: "open", startDate: "2026-10-26", endDate: "2026-10-31", surchargePerPax: 3000 }
])

test("upcoming includes a departure leaving today; bookable also drops sold out", () => {
  assert.deepEqual(
    upcomingDepartures(catalog, "2026-10-05").map((departure) => departure.id),
    ["today", "full", "open"]
  )
  assert.deepEqual(
    bookableDepartures(catalog, "2026-10-05").map((departure) => departure.id),
    ["today", "open"]
  )
  assert.deepEqual(bookableDepartures(catalog, "2026-10-06").map((departure) => departure.id), ["open"])
})

test("a selection is checked against the stored departures", () => {
  const today = "2026-10-05"
  assert.equal(resolveDepartureSelection(catalog, undefined, today).reason, "missing")
  assert.equal(resolveDepartureSelection(catalog, "nope", today).reason, "unknown")
  assert.equal(resolveDepartureSelection(catalog, "past", today).reason, "past")

  const soldOut = resolveDepartureSelection(catalog, "full", today)
  assert.equal(soldOut.reason, "sold-out")
  assert.match(soldOut.error, /Oct 16–21, 2026 just sold out/)

  const ok = resolveDepartureSelection(catalog, "open", today)
  assert.equal(ok.ok, true)
  assert.equal(ok.departure.id, "open")
})

test("labels read the way the consultant and customer see them", () => {
  assert.equal(formatDepartureRange({ startDate: "2026-10-26", endDate: "2026-10-31" }), "Oct 26–31, 2026")
  assert.equal(formatDepartureRange({ startDate: "2026-10-27", endDate: "2026-11-01" }), "Oct 27–Nov 1, 2026")
  assert.equal(
    formatDepartureRange({ startDate: "2026-12-28", endDate: "2027-01-02" }),
    "Dec 28, 2026–Jan 2, 2027"
  )
  assert.equal(
    formatDepartureLabel({ id: "x", startDate: "2026-10-26", endDate: "2026-10-31", surchargePerPax: 3000 }),
    "Oct 26–31, 2026 (+₱3,000/pax)"
  )
})

test("listing and counting fall back to legacy strings only when no departures exist", () => {
  const today = "2026-10-05"
  assert.deepEqual(departureDisplayList({ departures: catalog }, today), [
    "Oct 5–10, 2026",
    "Oct 16–21, 2026 — SOLD OUT",
    "Oct 26–31, 2026 (+₱3,000/pax)"
  ])
  assert.equal(countOpenDepartures({ departures: catalog }, today), 2)

  const legacy = { travelPeriods: ["Mar 04–08", "Mar 18–22"] }
  assert.deepEqual(departureDisplayList(legacy, today), ["Mar 04–08", "Mar 18–22"])
  assert.equal(countOpenDepartures(legacy, today), 2)
})

test("a default end date follows the package's length in days", () => {
  assert.equal(defaultEndDate("2026-10-26", 5), "2026-10-30")
  assert.equal(defaultEndDate("2026-12-30", 5), "2027-01-03")
  assert.equal(defaultEndDate("not a date", 5), "")
})
