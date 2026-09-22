"use client"

import { FormEvent, useId, useState } from "react"

import AvailabilityCalendar from "@/components/AvailabilityCalendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPricePHP } from "@/lib/price"
import { checkStayRange, formatStayDate, quoteStay } from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string }

export type StayBookingFormProps = {
  stayId: string
  stayTitle: string
  nightlyRate: number
  cleaningFee?: number
  currency?: string
  minimumNights?: number
  maxGuests: number
  blocks?: AvailabilityBlock[]
  availabilityUpdatedAt?: string
  /**
   * Renders for an admin reviewing the listing rather than a guest booking it.
   * Everything looks the same; the form just cannot be submitted, so checking a
   * draft never files a real request.
   */
  preview?: boolean
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

const labelClass = "text-sm font-medium text-foreground"

export default function StayBookingForm({
  stayId,
  stayTitle,
  nightlyRate,
  cleaningFee,
  currency = "PHP",
  minimumNights = 1,
  maxGuests,
  blocks,
  availabilityUpdatedAt,
  preview = false
}: StayBookingFormProps) {
  const fieldId = useId()
  const [checkIn, setCheckIn] = useState<string | null>(null)
  const [checkOut, setCheckOut] = useState<string | null>(null)
  const [guests, setGuests] = useState(1)
  const [state, setState] = useState<SubmitState>({ status: "idle" })

  const isSubmitting = state.status === "submitting"

  const range = checkStayRange(checkIn, checkOut, { minimumNights, blocks })
  const quote = range.ok ? quoteStay({ nightlyRate, cleaningFee, currency }, range.nights) : null

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (preview) return

    if (!range.ok) {
      setState({ status: "error", message: range.error })
      return
    }

    setState({ status: "submitting" })
    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stayId,
          checkIn,
          checkOut,
          guests,
          name: formData.get("name"),
          mobile: formData.get("mobile"),
          email: formData.get("email"),
          message: formData.get("message"),
          company: formData.get("company")
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setState({
          status: "error",
          message:
            getErrorMessage(payload) ??
            "We couldn't send that. Please try again, or message us directly."
        })
        return
      }

      setState({ status: "success" })
    } catch {
      setState({
        status: "error",
        message: "We couldn't reach the server. Check your connection and try again."
      })
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-primary/15 bg-card p-6">
        <h3 className="text-lg font-bold text-primary">Request sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve got your request for {stayTitle}
          {checkIn && checkOut ? (
            <>
              {" "}
              from {formatStayDate(checkIn)} to {formatStayDate(checkOut)}
            </>
          ) : null}
          . We&apos;ll confirm the unit is still free and come back within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-primary/15 bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-bold text-primary">
          {formatPricePHP(nightlyRate, currency)}
          <span className="text-base font-medium text-muted-foreground"> / night</span>
        </p>
      </div>

      <div className="mt-5">
        <AvailabilityCalendar
          blocks={blocks}
          minimumNights={minimumNights}
          checkIn={checkIn}
          checkOut={checkOut}
          onSelect={(nextIn, nextOut) => {
            setCheckIn(nextIn)
            setCheckOut(nextOut)
            // Clears a stale "those dates are taken" once the guest moves on.
            if (state.status === "error") setState({ status: "idle" })
          }}
          updatedLabel={
            availabilityUpdatedAt
              ? `Availability last updated ${formatStayDate(availabilityUpdatedAt.slice(0, 10))}.`
              : undefined
          }
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className={labelClass}>Check-in</span>
          <p className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm">
            {checkIn ? formatStayDate(checkIn) : <span className="text-muted-foreground">Pick a date</span>}
          </p>
        </div>
        <div className="space-y-1.5">
          <span className={labelClass}>Check-out</span>
          <p className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm">
            {checkOut ? formatStayDate(checkOut) : <span className="text-muted-foreground">Pick a date</span>}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <label htmlFor={`${fieldId}-guests`} className={labelClass}>
          Guests
        </label>
        <select
          id={`${fieldId}-guests`}
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>
              {count} guest{count === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      {/*
        The running total, shown only once the dates make a real stay. Quoting
        against an incomplete selection would mean the number jumps around as
        the guest clicks, which reads as a price that is not to be trusted.
      */}
      {quote ? (
        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
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
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
            <dt>Estimated total</dt>
            <dd>{formatPricePHP(quote.total, currency)}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-name`} className={labelClass}>
            Full name
          </label>
          <Input id={`${fieldId}-name`} name="name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-mobile`} className={labelClass}>
            Mobile number
          </label>
          <Input
            id={`${fieldId}-mobile`}
            name="mobile"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+63 917 000 0000"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-email`} className={labelClass}>
            Email address
          </label>
          <Input id={`${fieldId}-email`} name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-message`} className={labelClass}>
            Anything we should know?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id={`${fieldId}-message`}
            name="message"
            rows={3}
            placeholder="Arrival time, parking, extra mattress…"
          />
        </div>
      </div>

      {/* Honeypot: a real browser leaves this empty, bots fill it in. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${fieldId}-company`}>Company (leave blank)</label>
        <input id={`${fieldId}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      {!range.ok && checkIn ? (
        <p className="mt-4 text-sm text-muted-foreground">{range.error}</p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || preview || !range.ok}
        className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        {preview ? "Preview — requests disabled" : isSubmitting ? "Sending…" : "Request these dates"}
      </Button>

      {/*
        "Request", never "Book". The calendar is the owner's last save, not a
        live ledger, so the unit is only actually held once someone has checked
        — promising otherwise is the one failure this feature can cause.
      */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        This is a request, not a confirmed booking. We&apos;ll check the unit is still free and
        reply within 24 hours.
      </p>
    </form>
  )
}
