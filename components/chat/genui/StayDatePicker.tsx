"use client"

import { useState } from "react"

import AvailabilityCalendar from "@/components/AvailabilityCalendar"
import { Button } from "@/components/ui/button"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"
import { formatPricePHP } from "@/lib/price"
import { checkStayRange, formatStayDate, quoteStay } from "@/lib/stay-availability"

/**
 * The same calendar the unit's own page uses, inside the chat panel.
 *
 * Sharing `AvailabilityCalendar` rather than drawing a smaller one here is the
 * point: the rules about which nights are selectable — the minimum stay, the
 * check-out day that is not a night — are subtle enough that a second
 * implementation would drift, and the two would disagree about the same unit
 * on the same screen.
 *
 * Every figure comes from the payload, which the server built from the stored
 * record, so the total shown is never one the assistant composed.
 */
export default function StayDatePicker({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_stay_date_picker">) {
  const {
    prompt,
    stayTitle,
    nightlyRate,
    currency,
    cleaningFee,
    minimumNights,
    maxGuests,
    blocks,
    availabilityUpdatedAt
  } = widget.payload

  const [checkIn, setCheckIn] = useState<string | null>(null)
  const [checkOut, setCheckOut] = useState<string | null>(null)
  const [guests, setGuests] = useState(1)

  const range = checkStayRange(checkIn, checkOut, { minimumNights, blocks })
  const quote = range.ok ? quoteStay({ nightlyRate, cleaningFee, currency }, range.nights) : null

  if (answered) {
    return (
      <WidgetShell prompt={prompt} answered>
        <p className="text-sm text-muted-foreground">
          {checkIn && checkOut
            ? `${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`
            : "Dates chosen."}
        </p>
      </WidgetShell>
    )
  }

  return (
    <WidgetShell prompt={prompt} answered={answered}>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{stayTitle}</p>

        <AvailabilityCalendar
          blocks={blocks}
          minimumNights={minimumNights}
          checkIn={checkIn}
          checkOut={checkOut}
          onSelect={(nextIn, nextOut) => {
            setCheckIn(nextIn)
            setCheckOut(nextOut)
          }}
          updatedLabel={
            availabilityUpdatedAt
              ? `Availability last updated ${formatStayDate(availabilityUpdatedAt.slice(0, 10))}.`
              : undefined
          }
        />

        <div className="space-y-1.5">
          <label htmlFor="chat-stay-guests" className="text-xs font-medium text-foreground">
            Guests
          </label>
          <select
            id="chat-stay-guests"
            value={guests}
            disabled={disabled}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
              <option key={count} value={count}>
                {count} guest{count === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>

        {quote ? (
          <dl className="space-y-1 border-t border-border pt-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {formatPricePHP(quote.nightlyRate, currency)} × {quote.nights} night
                {quote.nights === 1 ? "" : "s"}
              </dt>
              <dd>{formatPricePHP(quote.accommodation, currency)}</dd>
            </div>
            {quote.cleaningFee > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cleaning fee</dt>
                <dd>{formatPricePHP(quote.cleaningFee, currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-1 text-sm font-bold text-primary">
              <dt>Estimated total</dt>
              <dd>{formatPricePHP(quote.total, currency)}</dd>
            </div>
          </dl>
        ) : null}

        {!range.ok && checkIn ? (
          <p className="text-xs text-muted-foreground">{range.error}</p>
        ) : null}

        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={disabled || !range.ok}
          onClick={() => {
            if (!range.ok || !checkIn || !checkOut) return
            onSubmit({ checkIn, checkOut, nights: range.nights, guests })
          }}
        >
          Use these dates
        </Button>
      </div>
    </WidgetShell>
  )
}
