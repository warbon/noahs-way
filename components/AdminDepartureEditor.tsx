"use client"

import { AlertTriangle, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminPackageRecord } from "@/lib/admin-package-types"
import {
  POSTER_TRAVEL_PERIODS_EVENT,
  createDepartureId,
  defaultEndDate,
  formatDepartureShort,
  parseLegacyTravelPeriod,
  type PackageDeparture,
  type ParsedLegacyPeriod
} from "@/lib/package-departures"
import { isDateString, todayInManila } from "@/lib/stay-availability"
import { cn } from "@/lib/utils"

type Row = {
  id: string
  startDate: string
  endDate: string
  /** Kept as typed, so a half-entered number is not rewritten under the cursor. */
  surcharge: string
  soldOut: boolean
}

function rowFromDeparture(departure: PackageDeparture): Row {
  return {
    id: departure.id,
    startDate: departure.startDate,
    endDate: departure.endDate,
    surcharge: departure.surchargePerPax ? String(departure.surchargePerPax) : "",
    soldOut: Boolean(departure.soldOut)
  }
}

function rowFromParsed(parsed: ParsedLegacyPeriod): Row {
  return rowFromDeparture({ ...parsed, id: createDepartureId() })
}

function rowProblem(row: Row) {
  if (!isDateString(row.startDate) || !isDateString(row.endDate)) return "Needs both dates, or it won't be saved."
  if (row.endDate < row.startDate) return "Ends before it starts, so it won't be saved."
  return null
}

/** What the server receives. Incomplete rows still go; `normalizeDepartures` drops them. */
function serialize(rows: Row[]) {
  if (rows.length === 0) return ""
  return JSON.stringify(
    rows.map((row) => {
      const surcharge = Number.parseFloat(row.surcharge.replace(/,/g, ""))
      return {
        id: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
        ...(Number.isFinite(surcharge) && surcharge > 0 ? { surchargePerPax: surcharge } : {}),
        ...(row.soldOut ? { soldOut: true } : {})
      }
    })
  )
}

/** Reads the Days field next door, so a new row's end date matches the package's length. */
function readDurationDays(root: HTMLElement | null) {
  const input = root?.closest("form")?.elements.namedItem("durationDays")
  const value = input instanceof HTMLInputElement ? Number.parseInt(input.value, 10) : Number.NaN
  return Number.isFinite(value) && value > 0 ? value : undefined
}

type Props = {
  pkg?: AdminPackageRecord | null
  disabled?: boolean
}

const labelClass = "text-sm font-medium text-foreground"
const hintClass = "text-xs text-muted-foreground"

/**
 * Travel periods as dated rows customers can book, each with its own surcharge
 * and a Sold out switch.
 *
 * A package that still carries only the poster's text is not converted behind
 * the admin's back. Opening it to fix a typo must not turn "Jan 16–20" into a
 * bookable departure in a year nobody checked, so the old lines stay exactly as
 * they are — and keep being submitted — until the admin presses Convert.
 */
export default function AdminDepartureEditor({ pkg, disabled }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [today] = useState(todayInManila)
  const referenceDate = (pkg?.updatedAt ?? pkg?.createdAt ?? today).slice(0, 10)

  const [rows, setRows] = useState<Row[]>(() => (pkg?.departures ?? []).map(rowFromDeparture))
  const [legacy, setLegacy] = useState<string[]>(() =>
    pkg?.departures?.length ? [] : (pkg?.travelPeriods ?? [])
  )
  const [needsYearCheck, setNeedsYearCheck] = useState(false)
  const [unreadable, setUnreadable] = useState<string[]>([])

  function importLines(lines: string[], reference: string) {
    const parsed: Row[] = []
    const failed: string[] = []
    for (const line of lines) {
      const result = parseLegacyTravelPeriod(line, reference)
      if (result) parsed.push(rowFromParsed(result))
      else failed.push(line)
    }

    setRows((current) => {
      const existing = new Set(current.map((row) => `${row.startDate}|${row.endDate}`))
      return [...current, ...parsed.filter((row) => !existing.has(`${row.startDate}|${row.endDate}`))]
    })
    setLegacy([])
    setUnreadable(failed)
    if (parsed.length > 0) setNeedsYearCheck(true)
  }

  // Latest version in a ref, so the listener below is attached once per form.
  const importRef = useRef(importLines)
  importRef.current = importLines

  useEffect(() => {
    const form = rootRef.current?.closest("form")
    if (!form) return

    function onPosterPeriods(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail
      if (!Array.isArray(detail)) return
      const lines = detail.filter((line): line is string => typeof line === "string" && Boolean(line.trim()))
      // A poster read is a fresh transcription, dated from today.
      if (lines.length > 0) importRef.current(lines, todayInManila())
    }

    form.addEventListener(POSTER_TRAVEL_PERIODS_EVENT, onPosterPeriods)
    return () => form.removeEventListener(POSTER_TRAVEL_PERIODS_EVENT, onPosterPeriods)
  }, [])

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function changeStart(row: Row, startDate: string) {
    // The end follows the start until someone sets it by hand: an end date that
    // no longer matches is easier to spot than one that silently stayed behind.
    const followsStart = !row.endDate || row.endDate === defaultEndDate(row.startDate, readDurationDays(rootRef.current))
    updateRow(row.id, {
      startDate,
      ...(followsStart ? { endDate: defaultEndDate(startDate, readDurationDays(rootRef.current)) } : {})
    })
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: createDepartureId(), startDate: "", endDate: "", surcharge: "", soldOut: false }
    ])
  }

  const openCount = rows.filter((row) => !rowProblem(row) && row.startDate >= today && !row.soldOut).length

  return (
    <div ref={rootRef} className="space-y-3">
      <input type="hidden" name="departures" value={serialize(rows)} />
      {/* Untouched poster text rides along unchanged until it is converted. */}
      {legacy.length > 0 ? <input type="hidden" name="travelPeriods" value={legacy.join("\n")} /> : null}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={labelClass} id="departures-heading">
          Travel periods
        </p>
        {rows.length > 0 ? (
          <p className={hintClass}>
            {openCount} open to book · {rows.filter((row) => row.soldOut).length} sold out
          </p>
        ) : null}
      </div>
      <p className={hintClass}>
        Customers pick one of these when they book. Past periods hide themselves from the website.
      </p>

      {legacy.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium text-foreground">From the poster, not bookable yet</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {legacy.map((line) => (
              <li key={line} className="rounded-full bg-background px-2.5 py-1 text-xs">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Customers see these as text and type their own dates. Convert them so customers pick a
            period instead — you will check each date before saving.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={disabled}
            onClick={() => importLines(legacy, referenceDate)}
          >
            Convert to bookable travel periods
          </Button>
        </div>
      ) : null}

      {needsYearCheck ? (
        <p role="note" className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Read from the poster text, which has no year.</strong> Every date was set to{" "}
            {referenceDate.slice(0, 4)} — check each one before saving. Cancel the panel to keep the
            old text instead.
          </span>
        </p>
      ) : null}

      {unreadable.length > 0 ? (
        <div role="note" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Could not read these — add them by hand:</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {unreadable.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul aria-labelledby="departures-heading" className="space-y-2">
          {rows.map((row) => {
            const problem = rowProblem(row)
            const isPast = isDateString(row.startDate) && row.startDate < today
            const name = isDateString(row.startDate) && isDateString(row.endDate)
              ? formatDepartureShort(row)
              : "new travel period"

            return (
              <li
                key={row.id}
                className={cn(
                  "rounded-lg border p-3",
                  row.soldOut ? "border-dashed border-border bg-muted/50" : "border-border bg-background",
                  isPast && "opacity-60"
                )}
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_7.5rem_auto_auto] sm:items-end">
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Leaves
                    <Input
                      type="date"
                      value={row.startDate}
                      disabled={disabled}
                      onChange={(event) => changeStart(row, event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Returns
                    <Input
                      type="date"
                      value={row.endDate}
                      min={row.startDate || undefined}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, { endDate: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium text-muted-foreground">
                    Surcharge ₱/pax
                    <Input
                      inputMode="numeric"
                      placeholder="0"
                      value={row.surcharge}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, { surcharge: event.target.value })}
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                      checked={row.soldOut}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, { soldOut: event.target.checked })}
                    />
                    Sold out
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${name}`}
                    disabled={disabled}
                    onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
                {problem || isPast ? (
                  <p className={cn("mt-2 text-xs", problem ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {problem ?? "Already departed — hidden from customers."}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add travel period
        </Button>
        <span className={hintClass}>The return date fills in from the Days field — change it if the poster differs.</span>
      </div>
    </div>
  )
}
