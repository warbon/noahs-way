"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Mirrors the date fields in InquiryForm, with the two checks that form is
 * missing: departures cannot be in the past and a return cannot precede a
 * departure. The server enforces both again in lib/inquiry-submission.ts.
 */
export default function TravelDatePicker({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_travel_date_picker">) {
  const minDate = today()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [flexible, setFlexible] = useState(false)

  const invalidRange = Boolean(from && to && to < from)

  return (
    <WidgetShell prompt={widget.payload.prompt} answered={answered}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Departure
          <Input
            type="date"
            value={from}
            min={minDate}
            disabled={disabled || answered}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Return
          <Input
            type="date"
            value={to}
            min={from || minDate}
            disabled={disabled || answered}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={flexible}
          disabled={disabled || answered}
          onChange={(event) => setFlexible(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        I can shift my dates to catch a promo fare
      </label>

      {invalidRange ? (
        <p className="mt-2 text-xs text-destructive">
          The return date must be on or after the departure date.
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={disabled || answered || invalidRange || (!from && !to && !flexible)}
        onClick={() =>
          onSubmit({
            travelDateFrom: from || undefined,
            travelDateTo: to || undefined,
            flexibleOnPromoDates: flexible
          })
        }
      >
        Use these dates
      </Button>
    </WidgetShell>
  )
}
