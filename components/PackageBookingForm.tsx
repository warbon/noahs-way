"use client"

import { Plane } from "lucide-react"
import { FormEvent, useId, useRef, useState } from "react"

import AirlineLogo from "@/components/AirlineLogo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ResolvedAirline } from "@/lib/airlines"
import { TRAVEL_TYPES } from "@/lib/inquiry-types"
import {
  departurePrice,
  formatDepartureDay,
  formatDepartureRange,
  formatDepartureShort,
  type PackageDeparture
} from "@/lib/package-departures"
import { formatPricePHP } from "@/lib/price"
import { todayInManila } from "@/lib/stay-availability"
import { cn } from "@/lib/utils"

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; periodLabel: string | null }
  | { status: "error"; message: string }

type Props = {
  packageId: string
  packageTitle: string
  basePrice?: number
  currency: string
  /** Upcoming departures, sold-out ones included. None bookable means the form asks for dates. */
  departures: PackageDeparture[]
  selected: PackageDeparture | null
  onSelect: (departure: PackageDeparture) => void
  /** The server refused the chosen departure: it sold out or went away since the page loaded. */
  onUnavailable: (departureId: string) => void
  /** Admin preview: shown exactly as customers see it, but it cannot file an inquiry. */
  preview?: boolean
  /** Airlines the package flies, named under the heading so the booking says who flies you. */
  airlines?: ResolvedAirline[]
}

function readError(payload: unknown) {
  if (!payload || typeof payload !== "object") return { message: null, code: null, reason: null }
  const record = payload as Record<string, unknown>
  return {
    message: typeof record.error === "string" ? record.error : null,
    code: typeof record.code === "string" ? record.code : null,
    reason: typeof record.reason === "string" ? record.reason : null
  }
}

const labelClass = "text-sm font-medium text-foreground"
const stepperClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-input bg-background text-xl text-primary disabled:opacity-40"

function Stepper({
  legend,
  name,
  value,
  min,
  max,
  onChange,
  noun
}: {
  legend: string
  name: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  /** Singular, for the button labels: "One more adult". */
  noun: string
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          className={stepperClass}
          aria-label={`One ${noun} fewer`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span aria-live="polite" className="min-w-[2ch] text-center text-base font-semibold">
          {value}
        </span>
        <button
          type="button"
          className={stepperClass}
          aria-label={`One more ${noun}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </fieldset>
  )
}

/**
 * Booking a package by picking one of its travel periods.
 *
 * The package already knows where it goes and when it leaves, so the customer
 * is not asked again: the dates come from the period they pick on the calendar,
 * which is why a request can no longer name a day the tour does not run. When
 * nothing is bookable — every period sold out, or none listed — it falls back
 * to asking for preferred dates, the one case a consultant has to propose some.
 *
 * Two steps in one form, both always mounted, like InquiryForm: going back
 * keeps every answer, including after a period sells out mid-booking.
 */
export default function PackageBookingForm({
  packageId,
  packageTitle,
  basePrice,
  currency,
  departures,
  selected,
  onSelect,
  onUnavailable,
  preview = false,
  airlines = []
}: Props) {
  const fieldId = useId()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [missing, setMissing] = useState(false)
  const [unavailableNotice, setUnavailableNotice] = useState<string | null>(null)
  const [state, setState] = useState<SubmitState>({ status: "idle" })

  const bookable = departures.filter((departure) => !departure.soldOut)
  const pickingPeriod = bookable.length > 0
  const allSoldOut = departures.length > 0 && !pickingPeriod
  const isSubmitting = state.status === "submitting"
  const travellers = `${adults} adult${adults === 1 ? "" : "s"}${
    children ? `, ${children} child${children === 1 ? "" : "ren"}` : ""
  }`
  const selectedPrice = selected ? departurePrice(basePrice, selected) : undefined
  const [today] = useState(todayInManila)

  function choose(departure: PackageDeparture) {
    setMissing(false)
    setUnavailableNotice(null)
    onSelect(departure)
  }

  function goToContactStep() {
    if (pickingPeriod && !selected) {
      setMissing(true)
      return
    }
    setStep(2)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (preview) return

    // The required contact fields sit on step 2, hidden during step 1, and a
    // browser cannot report a problem with a hidden field — so Enter on step 1
    // moves forward instead of failing silently.
    if (step !== 2) {
      goToContactStep()
      return
    }
    if (pickingPeriod && !selected) {
      setStep(1)
      setMissing(true)
      return
    }

    const formData = new FormData(event.currentTarget)
    const read = (name: string) => String(formData.get(name) ?? "")
    const chosen = pickingPeriod ? selected : null

    setState({ status: "submitting" })
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          ...(chosen
            ? { departureId: chosen.id }
            : { travelDateFrom: read("travelDateFrom"), travelDateTo: read("travelDateTo") }),
          adults: read("adults"),
          children: read("children"),
          childAges: read("childAges"),
          airportOfOrigin: read("airportOfOrigin"),
          travelType: read("travelType"),
          name: read("name"),
          mobile: read("mobile"),
          email: read("email"),
          message: read("message"),
          company: read("company")
        })
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        const error = readError(payload)
        if (error.code === "departure-unavailable" && chosen) {
          onUnavailable(chosen.id)
          setStep(1)
          setUnavailableNotice(
            error.reason === "sold-out"
              ? `${formatDepartureShort(chosen)} just sold out while you were booking — it's now marked sold out on the calendar. Pick another travel period; your other answers are kept.`
              : `${formatDepartureShort(chosen)} is no longer offered. Pick another travel period; your other answers are kept.`
          )
          setState({ status: "idle" })
          return
        }
        setState({
          status: "error",
          message: error.message ?? "We couldn't send your booking request. Please try again."
        })
        return
      }

      setState({ status: "success", periodLabel: chosen ? formatDepartureRange(chosen) : null })
      formRef.current?.reset()
    } catch {
      setState({ status: "error", message: "Network error. Please check your connection and try again." })
    }
  }

  const heading = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-bold text-primary">Book this package</h2>
      {state.status !== "success" ? (
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Step {step} of 2 — {step === 1 ? "Your trip" : "How we reach you"}
          </span>
          <span aria-hidden="true" className="flex w-24 gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-accent" />
            <span className={cn("h-1.5 flex-1 rounded-full", step === 2 ? "bg-accent" : "bg-muted")} />
          </span>
        </div>
      ) : null}
    </div>
  )

  if (state.status === "success") {
    return (
      <section id="book" className="scroll-mt-24 rounded-2xl border border-primary/15 bg-card p-6 shadow-lg">
        {heading}
        <div role="status" className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-lg font-bold text-primary">Booking request sent — thank you!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ve received your request
            {state.periodLabel ? (
              <>
                {" "}
                for <strong className="text-foreground">{state.periodLabel}</strong>
              </>
            ) : null}{" "}
            and will reply within 24 hours.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => {
              setStep(1)
              setState({ status: "idle" })
            }}
          >
            Send another request
          </Button>
        </div>
      </section>
    )
  }

  const quickPicks = bookable.slice(0, 3)

  const tripColumn = pickingPeriod ? (
    selected ? (
      <div className="rounded-2xl border border-secondary bg-secondary/25 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Your travel period
        </p>
        <p className="mt-1.5 text-2xl font-bold text-primary">{formatDepartureRange(selected)}</p>
        <p className="text-sm text-muted-foreground">
          {formatDepartureDay(selected.startDate)} → {formatDepartureDay(selected.endDate)}
        </p>
        <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm">
          {typeof basePrice === "number" ? (
            <>
              <dt className="text-muted-foreground">Package price</dt>
              <dd className="text-right">{formatPricePHP(basePrice, currency)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Travel-period surcharge</dt>
          <dd className="text-right">
            {selected.surchargePerPax ? `+${formatPricePHP(selected.surchargePerPax, currency)}` : "None"}
          </dd>
          {selectedPrice !== undefined ? (
            <>
              <dt className="border-t border-secondary pt-2 font-semibold">Per person</dt>
              <dd className="border-t border-secondary pt-2 text-right font-bold">
                {formatPricePHP(selectedPrice, currency)}
              </dd>
            </>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {travellers} · your consultant confirms the final total.
        </p>
        <a
          href="#travel-calendar"
          className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Change dates
        </a>
      </div>
    ) : (
      <div
        className={cn(
          "rounded-2xl bg-muted/40 p-5",
          missing ? "border-2 border-destructive" : "border border-dashed border-muted-foreground/40"
        )}
      >
        <p className="font-semibold text-foreground">No travel period picked yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a bar on the calendar above, or one of the soonest open dates:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickPicks.map((departure) => {
            const price = departurePrice(basePrice, departure)
            return (
              <button
                key={departure.id}
                type="button"
                onClick={() => choose(departure)}
                className="min-h-[40px] rounded-full border border-input bg-background px-3 text-xs font-semibold text-primary hover:border-primary/50"
              >
                {formatDepartureShort(departure)}
                {price !== undefined ? ` · ${formatPricePHP(price, currency)}` : ""}
              </button>
            )
          })}
        </div>
        {missing ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
            Pick a travel period to continue.
          </p>
        ) : null}
      </div>
    )
  ) : (
    <fieldset className="min-w-0 space-y-3">
      <legend className="font-semibold text-foreground">Preferred travel dates</legend>
      <p className="text-sm text-muted-foreground">
        {allSoldOut
          ? "Every listed travel period is sold out — tell us the dates you'd like and we'll check the next departures."
          : "Tell us the dates you'd like and we'll confirm the next departure."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          Departure
          <Input name="travelDateFrom" type="date" min={today} />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
          Return
          <Input name="travelDateTo" type="date" min={today} />
        </label>
      </div>
    </fieldset>
  )

  const form = (
    <form ref={formRef} onSubmit={onSubmit} className="mt-5 flex flex-wrap gap-x-6 gap-y-4 lg:gap-x-8">
      <div className="min-w-0 flex-[1_1_280px]">{tripColumn}</div>

      <div className="min-w-0 flex-[2_1_380px]">
        <fieldset className="space-y-4" disabled={isSubmitting} hidden={step !== 1}>
          <legend className="sr-only">Travellers</legend>
          <div className="grid grid-cols-2 gap-4">
            <Stepper legend="Adults" name="adults" value={adults} min={1} max={20} onChange={setAdults} noun="adult" />
            <Stepper legend="Children" name="children" value={children} min={0} max={10} onChange={setChildren} noun="child" />
          </div>
          {children > 0 ? (
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-ages`} className={labelClass}>
                Ages of children
              </label>
              <Input id={`${fieldId}-ages`} name="childAges" placeholder="e.g. 5 and 8" maxLength={200} />
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-origin`} className={labelClass}>
                Airport of origin
              </label>
              <Input id={`${fieldId}-origin`} name="airportOfOrigin" placeholder="Manila (MNL)" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-type`} className={labelClass}>
                Travel type
              </label>
              <select
                id={`${fieldId}-type`}
                name="travelType"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Not sure yet</option>
                {TRAVEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={goToContactStep}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto sm:min-w-[220px] lg:w-full"
            >
              Continue
            </Button>
          </div>
        </fieldset>

        <fieldset className="space-y-4" disabled={isSubmitting} hidden={step !== 2}>
          <legend className="sr-only">Your contact details</legend>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-name`} className={labelClass}>
              Full name
            </label>
            <Input id={`${fieldId}-name`} name="name" autoComplete="name" required maxLength={120} />
          </div>
          {/* One column again in the desktop sidebar, where an email address needs the full width. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-mobile`} className={labelClass}>
                Mobile number
              </label>
              <Input
                id={`${fieldId}-mobile`}
                name="mobile"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={40}
                placeholder="0917 123 4567"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`${fieldId}-email`} className={labelClass}>
                Email address
              </label>
              <Input id={`${fieldId}-email`} name="email" type="email" autoComplete="email" required maxLength={200} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-message`} className={labelClass}>
              Anything else we should know? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea id={`${fieldId}-message`} name="message" rows={3} maxLength={4000} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-start">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90 sm:min-w-[220px]"
            >
              {isSubmitting ? "Sending…" : "Send booking request"}
            </Button>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </fieldset>

        {/* Honeypot: hidden from people, tempting to bots. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
          <label htmlFor={`${fieldId}-company`}>Company (leave blank)</label>
          <input id={`${fieldId}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {state.status === "error" ? (
          <p role="alert" className="mt-4 text-sm font-medium text-destructive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )

  return (
    <section
      id="book"
      aria-label={`Book ${packageTitle}`}
      className="scroll-mt-24 rounded-2xl border border-primary/15 bg-card p-5 shadow-lg sm:p-6"
    >
      {heading}

      {airlines.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Plane className="h-4 w-4" aria-hidden="true" />
            {airlines.length === 1 ? "Airline" : "Airlines"}
          </span>
          {airlines.map((airline) => (
            <AirlineLogo
              key={airline.code ?? airline.name}
              airline={airline}
              height={16}
              className="font-medium text-foreground"
            />
          ))}
        </p>
      ) : null}

      {unavailableNotice ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
        >
          {unavailableNotice}
        </p>
      ) : null}

      {preview ? (
        <>
          <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
            Preview — the form is shown as customers see it, but cannot be sent from here.
          </p>
          {/* A disabled fieldset disables every control inside, so checking a
              draft never files a real inquiry. */}
          <fieldset disabled className="contents">
            {form}
          </fieldset>
        </>
      ) : (
        form
      )}

      <p className="mt-5 text-xs text-muted-foreground">
        We reply within 24 hours. Your details are only used to plan your trip.
      </p>
    </section>
  )
}
