"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  WEEKDAY_LABELS,
  addMonths,
  monthLabel,
  monthStart,
  monthWeekStarts,
  weekSegments
} from "@/lib/calendar-grid"
import {
  departurePrice,
  formatDepartureDay,
  formatDepartureShort,
  type PackageDeparture
} from "@/lib/package-departures"
import { formatPricePHP } from "@/lib/price"
import { messengerHref } from "@/lib/site-config"
import { addDays } from "@/lib/stay-availability"
import { cn } from "@/lib/utils"

type Props = {
  /** Upcoming departures, sold-out ones included so they can be shown as taken. */
  departures: PackageDeparture[]
  basePrice?: number
  currency: string
  selectedId: string | null
  onSelect: (departure: PackageDeparture) => void
  today: string
}

/** At least a year ahead, longer if the schedule runs further; never more than two. */
function monthRange(today: string, departures: PackageDeparture[]) {
  const first = monthStart(today)
  const lastDeparture = departures.reduce((latest, d) => (d.startDate > latest ? d.startDate : latest), first)
  const months = [first]
  while (months.length < 24) {
    const next = addMonths(months[months.length - 1], 1)
    if (months.length >= 12 && next > monthStart(lastDeparture)) break
    months.push(next)
  }
  return months
}

function shortMonth(monthFirst: string) {
  const [year, month] = monthFirst.split("-").map(Number)
  return new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1, 12))
  )
}

/** "₱39.9k": fits a bar a phone's seventh of the screen wide. */
function compactPrice(amount: number) {
  return `₱${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

/**
 * The package's travel periods on a monthly calendar, each drawn as a bar from
 * departure to return — the way a calendar app shows a multi-day event.
 *
 * A list of periods grows with every departure and pushes the booking form off
 * the screen; a month grid stays the same size whether there are five or fifty.
 * The month buttons above it put the whole year's availability on one line, so
 * nobody has to page through empty months to find the next opening.
 */
export default function TravelPeriodCalendar({
  departures,
  basePrice,
  currency,
  selectedId,
  onSelect,
  today
}: Props) {
  const months = useMemo(() => monthRange(today, departures), [today, departures])
  const firstOpen = departures.find((departure) => !departure.soldOut) ?? departures[0]
  const [visibleMonth, setVisibleMonth] = useState(() =>
    firstOpen ? monthStart(firstOpen.startDate) : months[0]
  )

  // A pick made elsewhere (the booking card's shortcuts) brings its month into view.
  const selected = departures.find((departure) => departure.id === selectedId) ?? null
  const selectedMonth = selected ? monthStart(selected.startDate) : null
  useEffect(() => {
    if (selectedMonth) setVisibleMonth(selectedMonth)
  }, [selectedMonth])

  const monthIndex = Math.max(months.indexOf(visibleMonth), 0)
  const openPrices = departures
    .filter((departure) => !departure.soldOut)
    .map((departure) => departurePrice(basePrice, departure))
    .filter((price): price is number => typeof price === "number")
  const lowestPrice = openPrices.length ? Math.min(...openPrices) : undefined

  const startingIn = (month: string) => departures.filter((departure) => monthStart(departure.startDate) === month)
  const visibleStarting = startingIn(visibleMonth)
  const visibleOpen = visibleStarting.filter((departure) => !departure.soldOut)
  const nextMonthEnd = addDays(addMonths(visibleMonth, 1), -1)
  const touchesVisibleMonth = departures.some(
    (departure) => departure.startDate <= nextMonthEnd && departure.endDate >= visibleMonth
  )

  const visibleLowest = visibleOpen
    .map((departure) => departurePrice(basePrice, departure))
    .filter((price): price is number => typeof price === "number")
  const monthSummary = visibleOpen.length
    ? [
        `${visibleOpen.length} open departure${visibleOpen.length === 1 ? "" : "s"}`,
        visibleStarting.length > visibleOpen.length ? `${visibleStarting.length - visibleOpen.length} sold out` : null,
        visibleLowest.length ? `from ${formatPricePHP(Math.min(...visibleLowest), currency)}` : null
      ]
        .filter(Boolean)
        .join(" · ")
    : visibleStarting.length
      ? "Every departure this month is sold out"
      : "No departures this month"

  const openTotal = departures.filter((departure) => !departure.soldOut).length

  return (
    <section
      id="travel-calendar"
      aria-labelledby="travel-calendar-heading"
      className="scroll-mt-24 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="travel-calendar-heading" className="text-2xl font-bold text-primary">
            Travel periods
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each bar is one trip, from departure to return. Prices are per person — pick a bar to book it.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {openTotal} open · {departures.length - openTotal} sold out
        </p>
      </div>

      <div
        role="group"
        aria-label="Jump to a month"
        className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-12 lg:overflow-visible"
      >
        {months.map((month) => {
          const starting = startingIn(month)
          const open = starting.filter((departure) => !departure.soldOut).length
          const status = open ? `${open} open` : starting.length ? "Sold out" : "No dates"
          const active = month === visibleMonth
          return (
            <button
              key={month}
              type="button"
              aria-pressed={active}
              aria-label={`${monthLabel(month)}, ${status}`}
              onClick={() => setVisibleMonth(month)}
              className={cn(
                "flex min-h-[52px] min-w-[76px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-1 text-center transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : open
                    ? "border-input bg-background text-primary hover:border-primary/50"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30"
              )}
            >
              <span className="text-xs font-semibold">{shortMonth(month)}</span>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  active ? "text-secondary" : open ? "text-emerald-700" : "text-muted-foreground"
                )}
              >
                {status}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            disabled={monthIndex <= 0}
            onClick={() => setVisibleMonth(months[monthIndex - 1])}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h3 aria-live="polite" className="min-w-[10.5rem] text-center text-lg font-bold text-primary">
            {monthLabel(visibleMonth)}
          </h3>
          <button
            type="button"
            aria-label="Next month"
            disabled={monthIndex >= months.length - 1}
            onClick={() => setVisibleMonth(months[monthIndex + 1])}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{monthSummary}</p>
      </div>

      {!touchesVisibleMonth ? (
        <p className="mt-3 rounded-xl border border-secondary bg-secondary/30 px-4 py-3 text-sm">
          <strong>No departures listed for {monthLabel(visibleMonth)}.</strong>{" "}
          <a
            href={messengerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-4"
          >
            Message us
          </a>{" "}
          and we&apos;ll check other dates for you.
        </p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border border-border" role="group" aria-label={monthLabel(visibleMonth)}>
        <div aria-hidden="true" className="grid grid-cols-7 bg-muted text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day} className="px-1 py-1.5 text-center sm:px-2.5 sm:text-left">
              {day}
            </span>
          ))}
        </div>

        {monthWeekStarts(visibleMonth).map((weekStart) => {
          const { segments, laneCount } = weekSegments(departures, weekStart)
          const lanes = Math.max(laneCount, 1)

          return (
            <div
              key={weekStart}
              className="grid grid-cols-7 border-t border-border [--day-row:22px] [--lane-row:26px] sm:[--day-row:30px] sm:[--lane-row:34px]"
              style={{ gridTemplateRows: `var(--day-row) repeat(${lanes}, var(--lane-row))` }}
            >
              {Array.from({ length: 7 }, (_, index) => {
                const date = addDays(weekStart, index)
                const inMonth = monthStart(date) === visibleMonth
                const muted = !inMonth || date < today
                const inSelection = Boolean(selected && date >= selected.startDate && date <= selected.endDate)
                const day = Number(date.slice(8))
                return (
                  <span
                    key={date}
                    aria-hidden="true"
                    style={{ gridColumn: index + 1, gridRow: `1 / span ${lanes + 1}` }}
                    className={cn(
                      "px-1 pt-0.5 text-[11px] sm:px-2.5 sm:pt-1.5 sm:text-sm",
                      index < 6 && "border-r border-border",
                      muted ? "text-muted-foreground" : "font-semibold text-foreground",
                      inSelection ? "bg-primary/[0.07]" : inMonth ? "bg-card" : "bg-muted/40"
                    )}
                  >
                    {day === 1 && !inMonth ? `${shortMonth(date).split(" ")[0]} 1` : day}
                  </span>
                )
              })}

              {segments.map((segment) => {
                const departure = segment.item
                const isSelected = departure.id === selectedId
                const price = departurePrice(basePrice, departure)
                const isLowest = price !== undefined && price === lowestPrice && !departure.soldOut
                const interactive = segment.startsHere && !departure.soldOut
                const label = formatDepartureShort(departure)

                const className = cn(
                  "relative z-[1] my-0.5 flex min-w-0 items-center justify-between gap-1.5 overflow-hidden whitespace-nowrap px-1.5 text-left text-[10px] font-semibold sm:my-[3px] sm:px-2.5 sm:text-xs",
                  segment.startsHere ? "ml-0.5 rounded-l-md sm:ml-1" : "rounded-l-none",
                  segment.continues ? "rounded-r-none" : "mr-0.5 rounded-r-md sm:mr-1",
                  departure.soldOut
                    ? "border border-dashed border-muted-foreground/40 bg-muted text-muted-foreground"
                    : isSelected
                      ? "border border-primary bg-primary text-primary-foreground"
                      : // Opaque, so the day gridlines do not show through the bar.
                        "border border-primary/30 bg-[hsl(214_55%_92%)] text-primary hover:bg-[hsl(214_55%_86%)]"
                )
                const style = { gridColumn: `${segment.column} / span ${segment.span}`, gridRow: segment.lane + 2 }

                if (!interactive) {
                  return (
                    <div key={`${departure.id}-${weekStart}`} aria-hidden="true" className={className} style={style}>
                      <span className="truncate">
                        {departure.soldOut
                          ? segment.startsHere
                            ? (
                                <>
                                  <span className="sm:hidden">Full</span>
                                  <span className="hidden sm:inline">Sold out · {label}</span>
                                </>
                              )
                            : <span className="hidden sm:inline">Sold out</span>
                          : <span className="hidden sm:inline">… {label}</span>}
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={`${departure.id}-${weekStart}`}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${formatDepartureDay(departure.startDate)} to ${formatDepartureDay(departure.endDate)}${
                      price !== undefined ? ` — ${formatPricePHP(price, currency)} per person` : ""
                    }`}
                    onClick={() => onSelect(departure)}
                    className={cn(className, "cursor-pointer focus-visible:z-[2]")}
                    style={style}
                  >
                    <span className="hidden truncate sm:inline">
                      {isSelected ? "✓ " : ""}
                      {label}
                    </span>
                    {price !== undefined ? (
                      <span
                        className={cn(
                          "shrink-0 font-bold",
                          isSelected ? "text-secondary" : isLowest ? "text-emerald-700" : undefined
                        )}
                      >
                        <span className="sm:hidden">{compactPrice(price)}</span>
                        <span className="hidden sm:inline">{formatPricePHP(price, currency)}</span>
                      </span>
                    ) : (
                      <span className="sm:hidden">{isSelected ? "✓" : "Pick"}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-7 rounded border border-primary/30 bg-[hsl(214_55%_92%)]" />
          Open trip
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-7 rounded bg-primary" />
          Your pick
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-7 rounded border border-dashed border-muted-foreground/40 bg-muted" />
          Sold out
        </span>
        {lowestPrice !== undefined ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="font-bold text-emerald-700">₱</span>
            Lowest price
          </span>
        ) : null}
      </div>
    </section>
  )
}
