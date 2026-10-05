"use client"

import { useState } from "react"

import WidgetShell from "@/components/chat/genui/WidgetShell"
import { Button } from "@/components/ui/button"
import type { ChatDepartureOption, GenUiComponentProps } from "@/lib/ai/genui-types"
import { WEEKDAY_LABELS, monthCells, monthLabel, monthStart } from "@/lib/calendar-grid"
import { formatPricePHP } from "@/lib/price"
import { cn } from "@/lib/utils"

function compactPrice(amount: number) {
  return `₱${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`
}

function shortMonthName(monthFirst: string) {
  return monthLabel(monthFirst).split(" ")[0].slice(0, 3)
}

/**
 * A package's travel periods on a one-month calendar small enough for the chat
 * panel. The panel is too narrow for the page's trip-long bars, so each
 * departure day carries its price and the picked trip is shaded end to end.
 * Sold-out departures are shown, crossed out, so "is the 16th open?" has a
 * visible answer instead of a silent gap.
 */
export default function DeparturePicker({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_travel_date_picker">) {
  const departures = widget.payload.departures ?? []
  const currency = widget.payload.currency ?? "PHP"

  const months = Array.from(new Set(departures.map((departure) => monthStart(departure.startDate)))).sort()
  const firstOpen = departures.find((departure) => !departure.soldOut) ?? departures[0]
  const [month, setMonth] = useState(() => (firstOpen ? monthStart(firstOpen.startDate) : months[0]))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = departures.find((departure) => departure.id === selectedId && !departure.soldOut) ?? null
  const byStart = new Map<string, ChatDepartureOption>()
  for (const departure of departures) {
    const existing = byStart.get(departure.startDate)
    // Two departures on one day: the open one wins the cell.
    if (!existing || (existing.soldOut && !departure.soldOut)) byStart.set(departure.startDate, departure)
  }
  const openPrices = departures
    .filter((departure) => !departure.soldOut && typeof departure.price === "number")
    .map((departure) => departure.price as number)
  const lowest = openPrices.length ? Math.min(...openPrices) : undefined
  const locked = disabled || answered

  return (
    <WidgetShell prompt={widget.payload.prompt} answered={answered}>
      <div role="group" aria-label="Month" className="flex gap-1.5 overflow-x-auto pb-1">
        {months.map((value) => {
          const open = departures.filter((d) => !d.soldOut && monthStart(d.startDate) === value).length
          const active = value === month
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={locked}
              onClick={() => setMonth(value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-primary"
              )}
            >
              {shortMonthName(value)} · {open ? `${open} open` : "full"}
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-center text-sm font-semibold text-primary">{monthLabel(month)}</p>
      <div className="mt-1.5 grid grid-cols-7 gap-1" role="group" aria-label={monthLabel(month)}>
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} aria-hidden="true" className="pb-0.5 text-center text-[10px] font-semibold text-muted-foreground">
            {day}
          </span>
        ))}
        {monthCells(month).map((date, index) => {
          if (!date) return <span key={`pad-${index}`} aria-hidden="true" />
          const departure = byStart.get(date)
          const inTrip = Boolean(selected && date >= selected.startDate && date <= selected.endDate)
          const isStart = selected?.startDate === date

          if (!departure) {
            return (
              <span
                key={date}
                aria-hidden="true"
                className={cn(
                  "flex h-10 items-center justify-center rounded-md text-xs",
                  inTrip ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {Number(date.slice(8))}
              </span>
            )
          }

          return (
            <button
              key={date}
              type="button"
              disabled={locked || departure.soldOut}
              aria-pressed={isStart}
              aria-label={`${departure.label}${
                departure.soldOut
                  ? ", sold out"
                  : departure.price !== undefined
                    ? ` — ${formatPricePHP(departure.price, currency)} per person`
                    : ""
              }`}
              onClick={() => setSelectedId(departure.id)}
              className={cn(
                "flex h-10 flex-col items-center justify-center rounded-md border text-xs leading-tight",
                departure.soldOut
                  ? "cursor-not-allowed border-dashed border-muted-foreground/40 bg-muted text-muted-foreground"
                  : isStart
                    ? "border-primary bg-primary text-primary-foreground"
                    : inTrip
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-input bg-background text-foreground hover:border-primary/50"
              )}
            >
              <span className={cn("font-semibold", departure.soldOut && "line-through")}>{Number(date.slice(8))}</span>
              <span
                className={cn(
                  "text-[9px]",
                  departure.soldOut
                    ? "font-semibold"
                    : !isStart && departure.price === lowest
                      ? "font-semibold text-emerald-700"
                      : undefined
                )}
              >
                {departure.soldOut ? "Full" : departure.price !== undefined ? compactPrice(departure.price) : "Open"}
              </span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <p className="mt-3 text-sm">
          <span className="font-semibold">{selected.label}</span>
          {selected.price !== undefined ? (
            <span className="text-muted-foreground"> · {formatPricePHP(selected.price, currency)} per person</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Tap a departure day. Prices are per person.</p>
      )}

      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={locked || !selected}
        onClick={() =>
          selected &&
          onSubmit({
            departureId: selected.id,
            travelDateFrom: selected.startDate,
            travelDateTo: selected.endDate,
            flexibleOnPromoDates: false
          })
        }
      >
        Use this travel period
      </Button>
    </WidgetShell>
  )
}
