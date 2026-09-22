"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatStayDate, isDateString, nightsBetween, todayInManila } from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"

type AdminAvailabilityEditorProps = {
  stayId: string
  stayTitle: string
  blocks: AvailabilityBlock[]
  onSaved: (blocks: AvailabilityBlock[], updatedAt: string | undefined) => void
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string }

/**
 * Deliberately the plainest thing that works: a list of ranges, an add row, a
 * remove button, one save.
 *
 * A drag-select calendar would be nicer to use twice and worse to use daily.
 * The guest-facing calendar is only as good as how reliably this gets updated,
 * so the cost that matters is the cost of blocking a week at 11pm on a phone —
 * which is two date fields, not a gesture.
 */
export default function AdminAvailabilityEditor({
  stayId,
  stayTitle,
  blocks,
  onSaved
}: AdminAvailabilityEditorProps) {
  const [rows, setRows] = useState<AvailabilityBlock[]>(blocks)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [note, setNote] = useState("")
  const [state, setState] = useState<SaveState>({ status: "idle" })
  const today = todayInManila()

  const canAdd = isDateString(from) && isDateString(to) && to > from

  function addRow() {
    if (!canAdd) return
    setRows((current) => [...current, { from, to, ...(note.trim() ? { note: note.trim() } : {}) }])
    setFrom("")
    setTo("")
    setNote("")
    setState({ status: "idle" })
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, position) => position !== index))
    setState({ status: "idle" })
  }

  async function save() {
    setState({ status: "saving" })

    try {
      const response = await fetch(`/api/admin/stays/${stayId}/availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: rows })
      })

      const payload = (await response.json().catch(() => null)) as
        | { stay?: { blocks?: AvailabilityBlock[]; availabilityUpdatedAt?: string }; error?: string }
        | null

      if (!response.ok) {
        setState({ status: "error", message: payload?.error ?? "Could not save availability." })
        return
      }

      // The server merges and sorts, so what comes back is what is stored —
      // adopting it keeps this list from disagreeing with the guest's calendar.
      const saved = payload?.stay?.blocks ?? rows
      setRows(saved)
      onSaved(saved, payload?.stay?.availabilityUpdatedAt)
      setState({ status: "saved" })
    } catch {
      setState({ status: "error", message: "Could not reach the server." })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-primary">Blocked dates — {stayTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the nights the unit is not free. Check-out day is not a night, so a guest leaving on
          the 5th and one arriving on the 5th do not clash.
        </p>
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {rows.map((block, index) => {
            const nights = nightsBetween(block.from, block.to)
            return (
              <li key={`${block.from}-${block.to}-${index}`} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatStayDate(block.from)} → {formatStayDate(block.to)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nights} night{nights === 1 ? "" : "s"}
                    {block.note ? ` · ${block.note}` : ""}
                    {block.to <= today ? " · past" : ""}
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => removeRow(index)}>
                  Remove
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing blocked — every night shows as free to guests.
        </p>
      )}

      <div className="rounded-xl border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="block-from" className="text-sm font-medium">
              First night blocked
            </label>
            <Input
              id="block-from"
              type="date"
              value={from}
              min={today}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="block-to" className="text-sm font-medium">
              Free again on
            </label>
            <Input
              id="block-to"
              type="date"
              value={to}
              min={from || today}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <label htmlFor="block-note" className="text-sm font-medium">
            Note <span className="font-normal text-muted-foreground">(optional, internal)</span>
          </label>
          <Input
            id="block-note"
            value={note}
            placeholder="Booked — R. Santos"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" disabled={!canAdd} onClick={addRow} className="mt-3">
          Add blocked range
        </Button>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={state.status === "saving"}>
          {state.status === "saving" ? "Saving…" : "Save availability"}
        </Button>
        {state.status === "saved" ? (
          <span className="text-sm text-emerald-600" role="status">
            Saved — guests see this now.
          </span>
        ) : null}
      </div>
    </div>
  )
}
