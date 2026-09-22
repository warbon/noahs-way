"use client"

import { useMemo, useState } from "react"

import {
  blockedNightsBetween,
  isRangeAvailable,
  nightsBetween,
  todayInManila
} from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"
import { cn } from "@/lib/utils"

type AvailabilityCalendarProps = {
  blocks: AvailabilityBlock[] | undefined
  minimumNights: number
  checkIn: string | null
  checkOut: string | null
  onSelect: (checkIn: string | null, checkOut: string | null) => void
  /** Rendered under the grid — when the owner last touched these dates. */
  updatedLabel?: string
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

/** First of the month containing `date`. */
function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`
}

function addMonths(monthFirst: string, count: number) {
  const [year, month] = monthFirst.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + count, 1, 12))
  return shifted.toISOString().slice(0, 10)
}

function monthLabel(monthFirst: string) {
  const [year, month] = monthFirst.split("-").map(Number)
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

/**
 * The days of one month, padded at the front with nulls so the 1st lands under
 * the right weekday.
 */
function monthCells(monthFirst: string): (string | null)[] {
  const [year, month] = monthFirst.split("-").map(Number)
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => `${monthFirst.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`)
  ]
}

export default function AvailabilityCalendar({
  blocks,
  minimumNights,
  checkIn,
  checkOut,
  onSelect,
  updatedLabel
}: AvailabilityCalendarProps) {
  /*
    `today` is read once per mount rather than per render. It only changes at
    midnight Manila time, and re-reading it on every render would mean a tab
    left open overnight could disable a day mid-interaction, between the click
    that selects it and the render that paints it.
  */
  const [today] = useState(todayInManila)
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(checkIn ?? today))
  const [hovered, setHovered] = useState<string | null>(null)

  const months = useMemo(() => [visibleMonth, addMonths(visibleMonth, 1)], [visibleMonth])

  /*
    Every blocked night across the two visible months plus a margin, computed
    once. Asking `isNightBlocked` per cell would re-normalize the whole block
    list roughly sixty times per render.
  */
  const blockedNights = useMemo(
    () => blockedNightsBetween(monthStart(today), addMonths(visibleMonth, 3), blocks),
    [blocks, today, visibleMonth]
  )

  const canGoBack = visibleMonth > monthStart(today)

  /**
   * The range being previewed: the confirmed one, or the one the pointer is
   * tracing out while a check-in is chosen but a check-out is not.
   */
  const previewEnd = checkOut ?? (checkIn && hovered && hovered > checkIn ? hovered : null)

  function isInRange(date: string) {
    if (!checkIn || !previewEnd) return false
    return date >= checkIn && date <= previewEnd
  }

  function handleClick(date: string) {
    // No check-in yet, or restarting: this click becomes the new check-in.
    if (!checkIn || checkOut || date <= checkIn) {
      onSelect(date, null)
      return
    }

    // A second click before the minimum, or across a booked stretch, is far
    // more likely to be a new check-in than a mistake worth erroring over.
    if (nightsBetween(checkIn, date) < minimumNights || !isRangeAvailable(checkIn, date, blocks)) {
      onSelect(date, null)
      return
    }

    onSelect(checkIn, date)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoBack && setVisibleMonth(addMonths(visibleMonth, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="rounded-md border border-input px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          ←
        </button>
        {/*
          Names only the months actually on screen. Mobile shows one grid, so
          announcing a two-month range there tells a screen-reader user about
          dates they cannot reach. Visible on mobile, announced-only on wider
          screens where each grid carries its own heading.
        */}
        <p className="text-sm font-semibold text-primary sm:sr-only" aria-live="polite">
          <span className="sm:hidden">{monthLabel(months[0])}</span>
          <span className="hidden sm:inline">
            {monthLabel(months[0])} to {monthLabel(months[1])}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          aria-label="Next month"
          className="rounded-md border border-input px-3 py-1.5 text-sm font-medium"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {months.map((month, monthIndex) => (
          <div key={month} className={monthIndex === 1 ? "hidden sm:block" : undefined}>
            <p className="mb-2 hidden text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
              {monthLabel(month)}
            </p>
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel(month)}>
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {monthCells(month).map((date, index) => {
                if (!date) return <div key={`pad-${index}`} />

                const isPast = date < today
                const isBlockedNight = blockedNights.has(date)

                /*
                  A blocked night can still be a legal check-out: the guest
                  before you sleeps there, you do not. Offering it only once a
                  check-in exists keeps that from reading as an inconsistency —
                  the same cell is unselectable as a start and selectable as an
                  end.
                */
                const selectableAsCheckOut =
                  Boolean(checkIn) && !checkOut && date > checkIn! && !isPast

                const disabled = isPast || (isBlockedNight && !selectableAsCheckOut)
                const isEdge = date === checkIn || date === checkOut

                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    disabled={disabled}
                    onClick={() => handleClick(date)}
                    onMouseEnter={() => setHovered(date)}
                    onMouseLeave={() => setHovered((current) => (current === date ? null : current))}
                    aria-label={`${date}${isBlockedNight ? " — not available" : ""}`}
                    aria-selected={isEdge}
                    className={cn(
                      "relative h-9 rounded-md text-sm transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      disabled && "cursor-not-allowed text-muted-foreground/40",
                      // Struck through rather than merely greyed: "past" and
                      // "booked" have to be tellable apart at a glance.
                      isBlockedNight && !isPast && "line-through decoration-muted-foreground/60",
                      !disabled && !isEdge && !isInRange(date) && "hover:bg-muted",
                      isInRange(date) && !isEdge && "bg-accent/20 text-primary",
                      isEdge && "bg-primary font-bold text-primary-foreground"
                    )}
                  >
                    {Number(date.slice(8))}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-primary" /> Your dates
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="relative h-3 w-3 rounded-sm border border-muted-foreground/40 bg-muted after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-muted-foreground/70"
          />
          Already booked
        </span>
        {minimumNights > 1 ? (
          <span>
            Minimum {minimumNights} night{minimumNights === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {updatedLabel ? (
        /*
          Stated plainly rather than hidden in a tooltip. A calendar nobody has
          touched in weeks still looks authoritative, and a guest who can see
          the date decides for themselves whether to trust it or call.
        */
        <p className="mt-2 text-xs text-muted-foreground">{updatedLabel}</p>
      ) : null}
    </div>
  )
}
