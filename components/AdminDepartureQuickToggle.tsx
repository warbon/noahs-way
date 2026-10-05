"use client"

import { useState } from "react"

import type { AdminPackageRecord } from "@/lib/admin-package-types"
import { formatDepartureLabel, upcomingDepartures, type PackageDeparture } from "@/lib/package-departures"
import { todayInManila } from "@/lib/stay-availability"
import { cn } from "@/lib/utils"

type Props = {
  pkg: AdminPackageRecord
  id: string
  onChanged: (departures: PackageDeparture[]) => void
  onEdit: () => void
}

function errorFrom(payload: unknown) {
  if (!payload || typeof payload !== "object") return null
  const error = (payload as Record<string, unknown>).error
  return typeof error === "string" ? error : null
}

/**
 * The upcoming departures of one package with a Sold out switch each, opened
 * from its row. Each switch saves on its own, so marking a departure full while
 * the operator is on the phone is one click — not open, scroll, save.
 */
export default function AdminDepartureQuickToggle({ pkg, id, onChanged, onEdit }: Props) {
  const [today] = useState(todayInManila)
  // The switch shows the new value at once and falls back if the save fails;
  // a checkbox that ignores the click until the server answers reads as broken.
  const [pending, setPending] = useState<{ id: string; soldOut: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upcoming = upcomingDepartures(pkg.departures, today)

  async function toggle(departure: PackageDeparture) {
    const soldOut = !departure.soldOut
    setPending({ id: departure.id, soldOut })
    setError(null)
    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}/departures`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departureId: departure.id, soldOut })
      })
      const payload = (await response.json().catch(() => null)) as { departures?: PackageDeparture[] } | null
      if (!response.ok || !payload?.departures) {
        setError(errorFrom(payload) ?? "Could not save that change.")
        return
      }
      onChanged(payload.departures)
    } catch {
      setError("Network error — the change was not saved.")
    } finally {
      setPending(null)
    }
  }

  return (
    <div id={id} className="basis-full rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-primary">Travel periods</p>
        <p className="text-xs text-muted-foreground">Each switch saves straight away.</p>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No upcoming travel periods. Customers enter their own dates until you add some.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {upcoming.map((departure) => {
            const saving = pending?.id === departure.id
            const soldOut = saving ? pending.soldOut : Boolean(departure.soldOut)
            return (
              <li key={departure.id} className="flex flex-wrap items-center justify-between gap-3 py-1.5">
                <span
                  className={cn(
                    "text-sm",
                    soldOut ? "text-muted-foreground line-through" : "font-medium text-foreground"
                  )}
                >
                  {formatDepartureLabel(departure)}
                </span>
                <label className="inline-flex min-h-[40px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                    checked={soldOut}
                    disabled={pending !== null}
                    onChange={() => toggle(departure)}
                  />
                  {saving ? "Saving…" : "Sold out"}
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onEdit}
        className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Edit dates and surcharges
      </button>
    </div>
  )
}
