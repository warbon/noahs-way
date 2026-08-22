"use client"

import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import type { PosterExtraction } from "@/lib/ai/poster-extraction"

/**
 * Fills the package form from the attached poster.
 *
 * It writes into the form and stops there — nothing is saved until the admin
 * reviews the values and submits. That ordering is the whole safety model: the
 * reader is good but not perfect (it has skipped a travel-period block before),
 * and a misread price that reaches the storefront is the exact failure this
 * catalogue was cleaned up to remove.
 *
 * The form fields are uncontrolled, so values are written straight to the DOM
 * nodes with the native setter and an input event — React never owns them.
 */

type State =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "done"; filled: string[]; unreadable: string[] }
  | { status: "error"; message: string }

/** Which form input each extracted field belongs in. */
const TEXT_FIELDS: (keyof PosterExtraction)[] = [
  "title",
  "destination",
  "summary",
  "details",
  "price",
  "priceAmount",
  "currency",
  "durationDays",
  "durationNights",
  "imageAlt"
]

const LINE_FIELDS: (keyof PosterExtraction)[] = [
  "travelPeriods",
  "highlights",
  "inclusions",
  "exclusions"
]

function setFieldValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
  if (!el) return false

  const prototype =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
  return true
}

/** The admin itinerary textarea format: `Day 1 | Title | Activity; Activity`. */
function itineraryToText(itinerary: PosterExtraction["itinerary"]) {
  if (!itinerary?.length) return ""
  return itinerary
    .map((day) => {
      const activities = day.activities?.length ? ` | ${day.activities.join("; ")}` : ""
      return `Day ${day.day} | ${day.title}${activities}`
    })
    .join("\n")
}

export default function AdminPosterReader({ disabled }: { disabled?: boolean }) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<State>({ status: "idle" })

  const isReading = state.status === "reading"

  async function readPoster() {
    const form = anchorRef.current?.closest("form")
    if (!form) return

    const fileInput = form.querySelector<HTMLInputElement>('input[name="image"]')
    const file = fileInput?.files?.[0]

    if (!file) {
      setState({ status: "error", message: "Choose a poster image first." })
      return
    }

    setState({ status: "reading" })

    const body = new FormData()
    body.append("image", file)

    let payload: { fields?: PosterExtraction; error?: string }
    try {
      const response = await fetch("/api/admin/packages/read-poster", { method: "POST", body })
      payload = await response.json()

      if (!response.ok) {
        setState({ status: "error", message: payload.error ?? "Could not read the poster." })
        return
      }
    } catch {
      setState({ status: "error", message: "Network error while reading the poster." })
      return
    }

    const fields = payload.fields ?? {}
    const filled: string[] = []

    for (const key of TEXT_FIELDS) {
      const value = fields[key]
      if (value === undefined || value === null || value === "") continue
      if (setFieldValue(form, key, String(value))) filled.push(key)
    }

    for (const key of LINE_FIELDS) {
      const value = fields[key]
      if (!Array.isArray(value) || value.length === 0) continue
      if (setFieldValue(form, key, value.join("\n"))) filled.push(key)
    }

    const itineraryText = itineraryToText(fields.itinerary)
    if (itineraryText && setFieldValue(form, "itinerary", itineraryText)) {
      filled.push(`itinerary (${fields.itinerary?.length} days)`)
    }

    setState({
      status: "done",
      filled,
      unreadable: Array.isArray(fields.unreadable) ? fields.unreadable : []
    })
  }

  return (
    <div ref={anchorRef} className="rounded-xl border border-primary/15 bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Read the poster</p>
          <p className={"mt-0.5 text-xs text-muted-foreground"}>
            Transcribes the attached poster into the fields below. Always check the numbers
            before saving.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={readPoster} disabled={disabled || isReading}>
          {isReading ? "Reading…" : "Read poster"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {state.message}
        </p>
      ) : null}

      {state.status === "done" ? (
        <div role="status" className="mt-3 space-y-2 text-sm">
          {state.filled.length > 0 ? (
            <>
              <p className="font-semibold text-primary">
                Filled {state.filled.length} field{state.filled.length === 1 ? "" : "s"} — review
                them before saving.
              </p>
              <p className="text-xs text-muted-foreground">{state.filled.join(", ")}</p>
            </>
          ) : (
            <p className="font-semibold text-foreground">
              Nothing could be read from this image. Fill the fields in by hand.
            </p>
          )}

          {state.unreadable.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive">
                Could not read with confidence — check these on the poster yourself:
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {state.unreadable.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
