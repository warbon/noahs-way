import assert from "node:assert/strict"
import test from "node:test"

import { addMonths, monthCells, monthWeekStarts, weekSegments } from "../lib/calendar-grid.ts"

test("month cells pad the 1st under its weekday", () => {
  // October 2026 starts on a Thursday; November 2026 on a Sunday.
  const october = monthCells("2026-10-01")
  assert.equal(october.slice(0, 4).every((cell) => cell === null), true)
  assert.equal(october[4], "2026-10-01")
  assert.equal(october.length, 4 + 31)

  const november = monthCells("2026-11-01")
  assert.equal(november[0], "2026-11-01")
  assert.equal(november.length, 30)
})

test("months add across a year boundary", () => {
  assert.equal(addMonths("2026-12-01", 1), "2027-01-01")
  assert.equal(addMonths("2027-01-01", -1), "2026-12-01")
})

test("month weeks start on the Sunday on or before the 1st", () => {
  assert.deepEqual(monthWeekStarts("2026-10-01"), [
    "2026-09-27",
    "2026-10-04",
    "2026-10-11",
    "2026-10-18",
    "2026-10-25"
  ])
  assert.equal(monthWeekStarts("2026-11-01")[0], "2026-11-01")
})

const range = (id, startDate, endDate) => ({ id, startDate, endDate })

test("a range crossing a week boundary splits into a continuing and a carried-over segment", () => {
  const trip = range("oct27", "2026-10-27", "2026-11-01")

  const first = weekSegments([trip], "2026-10-25").segments[0]
  assert.deepEqual(
    { column: first.column, span: first.span, startsHere: first.startsHere, continues: first.continues },
    { column: 3, span: 5, startsHere: true, continues: true }
  )

  const second = weekSegments([trip], "2026-11-01").segments[0]
  assert.deepEqual(
    { column: second.column, span: second.span, startsHere: second.startsHere, continues: second.continues },
    { column: 1, span: 1, startsHere: false, continues: false }
  )
})

test("overlapping ranges stack in lanes and back-to-back ones share a lane", () => {
  const { segments, laneCount } = weekSegments(
    [
      range("a", "2026-10-14", "2026-10-19"),
      range("b", "2026-10-15", "2026-10-20"),
      range("c", "2026-10-16", "2026-10-21")
    ],
    "2026-10-11"
  )
  assert.equal(laneCount, 3)
  assert.deepEqual(
    segments.map((segment) => [segment.item.id, segment.lane]),
    [["a", 0], ["b", 1], ["c", 2]]
  )

  // Carried into the next week, all three start on its Sunday: they keep their rows.
  const nextWeek = weekSegments(
    [
      range("c", "2026-10-16", "2026-10-21"),
      range("b", "2026-10-15", "2026-10-20"),
      range("a", "2026-10-14", "2026-10-19")
    ],
    "2026-10-18"
  )
  assert.deepEqual(
    nextWeek.segments.map((segment) => [segment.item.id, segment.lane]),
    [["a", 0], ["b", 1], ["c", 2]]
  )

  const backToBack = weekSegments(
    [range("x", "2026-11-01", "2026-11-03"), range("y", "2026-11-04", "2026-11-06")],
    "2026-11-01"
  )
  assert.equal(backToBack.laneCount, 1)
})

test("ranges outside the week are left out", () => {
  assert.deepEqual(weekSegments([range("z", "2026-12-01", "2026-12-05")], "2026-10-11"), {
    segments: [],
    laneCount: 0
  })
})
