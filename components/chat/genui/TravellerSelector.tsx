"use client"

import { Minus, Plus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

function Stepper({
  label,
  value,
  min,
  disabled,
  onChange
}: {
  label: string
  value: number
  min: number
  disabled: boolean
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span aria-live="polite" className="w-6 text-center text-sm font-semibold">
          {value}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={disabled || value >= 20}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export default function TravellerSelector({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_traveller_selector">) {
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [childAges, setChildAges] = useState("")

  const locked = disabled || answered

  return (
    <WidgetShell prompt={widget.payload.prompt} answered={answered}>
      <div className="space-y-2">
        <Stepper label="Adults" value={adults} min={1} disabled={locked} onChange={setAdults} />
        <Stepper label="Children" value={children} min={0} disabled={locked} onChange={setChildren} />

        {children > 0 ? (
          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
            {/* Ages drive child pricing, so free text beats a second set of steppers. */}
            Children&apos;s ages
            <Input
              value={childAges}
              disabled={locked}
              placeholder="e.g. 5, 8 and 11"
              onChange={(event) => setChildAges(event.target.value)}
            />
          </label>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={locked}
        onClick={() => onSubmit({ adults, children, childAges: childAges.trim() || undefined })}
      >
        Confirm travellers
      </Button>
    </WidgetShell>
  )
}
