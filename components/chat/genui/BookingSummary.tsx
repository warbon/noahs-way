"use client"

import { Button } from "@/components/ui/button"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null

  return (
    <div className="flex gap-3 py-1 text-sm">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-foreground">{value}</dd>
    </div>
  )
}

function travellerLine(adults?: number, children?: number, childAges?: string) {
  if (!adults && !children) return undefined

  const parts = [`${adults ?? 0} adult(s)`, `${children ?? 0} child(ren)`]
  const line = parts.join(", ")
  return childAges ? `${line} — ages ${childAges}` : line
}

/**
 * The last step, and the only one that writes anything. Pressing Confirm posts
 * to /api/chat/booking, which submits the draft the server staged — the fields
 * shown here are a recap of that draft, not the payload.
 */
export default function BookingSummary({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_booking_summary">) {
  const { prompt, draft, packageTitle } = widget.payload
  const locked = disabled || answered

  const travelWindow =
    draft.travelDateFrom || draft.travelDateTo
      ? `${draft.travelDateFrom ?? "?"} to ${draft.travelDateTo ?? "?"}${
          draft.flexibleOnPromoDates ? " (flexible for promo fares)" : ""
        }`
      : undefined

  return (
    <WidgetShell prompt={prompt} answered={answered}>
      <dl className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/30 px-3 py-1">
        <Row label="Package" value={packageTitle} />
        <Row label="Destination" value={draft.destination} />
        <Row label="Travel" value={travelWindow} />
        <Row label="Departing" value={draft.airportOfOrigin} />
        <Row
          label="Travellers"
          value={travellerLine(draft.adults, draft.children, draft.childAges)}
        />
        <Row label="Trip type" value={draft.travelType} />
        <Row label="Name" value={draft.name} />
        <Row label="Mobile" value={draft.mobile} />
        <Row label="Email" value={draft.email} />
        <Row label="Notes" value={draft.message} />
      </dl>

      <p className="mt-2 text-xs text-muted-foreground">
        This sends a booking request — no payment is taken. A travel consultant confirms
        availability and the final price within 24 hours.
      </p>

      {/* Buttons carry whitespace-nowrap, so they cannot shrink to fit: without an
          explicit basis to wrap on, the second one runs off the panel on phones. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 basis-48"
          disabled={locked}
          onClick={() => onSubmit({ confirmed: true })}
        >
          Confirm booking request
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 basis-48"
          disabled={locked}
          onClick={() => onSubmit({ confirmed: false })}
        >
          Change something
        </Button>
      </div>
    </WidgetShell>
  )
}
