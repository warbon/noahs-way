"use client"

import { Plus, X } from "lucide-react"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"

import AirlineLogo from "@/components/AirlineLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminPackageRecord } from "@/lib/admin-package-types"
import {
  AIRLINES,
  MAX_AIRLINES,
  POSTER_AIRLINES_EVENT,
  findAirlinesInText,
  normalizeAirlines,
  resolveAirline
} from "@/lib/airlines"

type Props = {
  pkg?: AdminPackageRecord | null
  disabled?: boolean
}

const labelClass = "text-sm font-medium text-foreground"
const hintClass = "text-xs text-muted-foreground"
const OTHER = "__other"

const AIRLINES_BY_NAME = [...AIRLINES].sort((a, b) => a.name.localeCompare(b.name))

/** Everything a saved package says in words, where an airline or a flight number may already be written. */
function packageText(pkg: AdminPackageRecord) {
  return [
    pkg.details,
    pkg.summary,
    ...(pkg.itinerary ?? []).flatMap((day) => [day.title, day.description, ...(day.activities ?? [])]),
    ...(pkg.inclusions ?? []),
    ...(pkg.exclusions ?? [])
  ]
    .filter(Boolean)
    .join("\n")
}

/**
 * The airlines a package flies, picked from the built-in list (each with its
 * logo) or typed in for one that isn't on it. Read poster fills it in through
 * POSTER_AIRLINES_EVENT on the form, the way travel periods are handed over.
 *
 * A package saved before this field existed often names its airline already —
 * "via Cebu Pacific" in the inclusions, "5J 188" in the itinerary — so those
 * are offered as one-click suggestions rather than left to be found by hand.
 */
export default function AdminAirlinePicker({ pkg, disabled }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [entries, setEntries] = useState<string[]>(() => normalizeAirlines(pkg?.airlines ?? []))
  const [suggested] = useState<string[]>(() =>
    pkg && !pkg.airlines?.length ? findAirlinesInText(packageText(pkg)) : []
  )
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherName, setOtherName] = useState("")

  useEffect(() => {
    const form = rootRef.current?.closest("form")
    if (!form) return

    function onPosterAirlines(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail
      // A poster read is the new source for the whole form, airlines included.
      if (Array.isArray(detail)) setEntries(normalizeAirlines(detail))
    }

    form.addEventListener(POSTER_AIRLINES_EVENT, onPosterAirlines)
    return () => form.removeEventListener(POSTER_AIRLINES_EVENT, onPosterAirlines)
  }, [])

  function add(entry: string) {
    setEntries((current) => normalizeAirlines([...current, entry]))
  }

  function addOther() {
    if (!otherName.trim()) return
    add(otherName)
    setOtherName("")
    setOtherOpen(false)
  }

  function onOtherKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the airline; it must not submit the whole package form.
    if (event.key === "Enter") {
      event.preventDefault()
      addOther()
    }
  }

  const chosen = new Set(entries)
  const openSuggestions = suggested.filter((code) => !chosen.has(code))
  const full = entries.length >= MAX_AIRLINES

  return (
    <div ref={rootRef} className="space-y-2">
      <input type="hidden" name="airlines" value={entries.join("\n")} />

      <p id="airlines-label" className={labelClass}>
        Airline
      </p>

      {entries.length > 0 ? (
        <ul aria-labelledby="airlines-label" className="flex flex-wrap gap-2">
          {entries.map((entry) => {
            const airline = resolveAirline(entry)
            return (
              <li
                key={entry}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background py-1 pl-2 pr-1 text-sm font-medium"
              >
                <AirlineLogo airline={airline} height={16} />
                <button
                  type="button"
                  aria-label={`Remove ${airline.name}`}
                  disabled={disabled}
                  onClick={() => setEntries((current) => current.filter((item) => item !== entry))}
                  className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {openSuggestions.length > 0 && !full ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Found in this package:</span>
          {openSuggestions.map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => add(code)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {resolveAirline(code).name}
            </Button>
          ))}
        </div>
      ) : null}

      {full ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Add an airline"
            value=""
            disabled={disabled}
            onChange={(event) => {
              const value = event.target.value
              if (value === OTHER) setOtherOpen(true)
              else if (value) add(value)
            }}
            className="flex h-10 min-w-[14rem] rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{entries.length > 0 ? "Add another airline…" : "Add an airline…"}</option>
            {AIRLINES_BY_NAME.filter((airline) => !chosen.has(airline.code)).map((airline) => (
              <option key={airline.code} value={airline.code}>
                {airline.name} ({airline.code})
              </option>
            ))}
            <option value={OTHER}>Other airline…</option>
          </select>

          {otherOpen ? (
            <>
              <Input
                aria-label="Airline name"
                value={otherName}
                maxLength={60}
                disabled={disabled}
                placeholder="Airline name"
                onChange={(event) => setOtherName(event.target.value)}
                onKeyDown={onOtherKeyDown}
                className="w-56"
              />
              <Button type="button" size="sm" variant="outline" disabled={disabled || !otherName.trim()} onClick={addOther}>
                Add
              </Button>
            </>
          ) : null}
        </div>
      )}

      <p className={hintClass}>
        Shown with its logo on the package page, the package cards and the booking form, and named
        in the Facebook post. Read poster fills it in.
      </p>
    </div>
  )
}
