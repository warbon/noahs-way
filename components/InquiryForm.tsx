"use client"

import { FormEvent, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TRAVEL_TYPES } from "@/lib/inquiry-types"

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string }

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

export type InquiryFormProps = {
  /** Present when the form is opened from a specific package's CTA. */
  packageId?: string
  packageTitle?: string
  intro?: string
  onSuccess?: () => void
}

const labelClass = "text-sm font-medium text-foreground"
const optionalClass = "font-normal text-muted-foreground"

export default function InquiryForm({
  packageId,
  packageTitle,
  intro,
  onSuccess
}: InquiryFormProps) {
  const fieldId = useId()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [state, setState] = useState<SubmitState>({ status: "idle" })
  /*
    Two steps, one form. Fourteen inputs on a single screen reads as work even
    though only three of them are required — so the trip questions come first
    and the required contact details sit on their own step.

    Both fieldsets stay mounted and the inactive one is `hidden`, which keeps
    every value in the same FormData on submit and means nothing is lost
    stepping back and forth. `hidden` also takes the fields out of the tab order,
    so the required inputs can never be validated while off-screen.
  */
  const [step, setStep] = useState<1 | 2>(1)

  /*
    Recomputed per render, not once at module load: this module is evaluated
    when the page first loads, so a tab left open overnight would otherwise keep
    yesterday as the earliest selectable departure.

    Native date inputs render in the visitor's own device locale, so a Philippine
    customer already sees dd/mm/yyyy. Blocking past dates is the only real gap.
  */
  const today = new Date().toISOString().slice(0, 10)

  const isSubmitting = state.status === "submitting"

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Every required field lives on step 2, which is `hidden` while step 1 is
    // showing. Browsers cannot report a validation error on a hidden input, so
    // an unexpected submit here advances instead of failing silently.
    if (step !== 2) {
      setStep(2)
      return
    }

    const formData = new FormData(event.currentTarget)
    const body = {
      name: String(formData.get("name") ?? ""),
      mobile: String(formData.get("mobile") ?? ""),
      email: String(formData.get("email") ?? ""),
      destination: String(formData.get("destination") ?? ""),
      airportOfOrigin: String(formData.get("airportOfOrigin") ?? ""),
      travelDateFrom: String(formData.get("travelDateFrom") ?? ""),
      travelDateTo: String(formData.get("travelDateTo") ?? ""),
      flexibleOnPromoDates: formData.get("flexibleOnPromoDates") === "yes",
      adults: String(formData.get("adults") ?? ""),
      children: String(formData.get("children") ?? ""),
      childAges: String(formData.get("childAges") ?? ""),
      travelType: String(formData.get("travelType") ?? ""),
      message: String(formData.get("message") ?? ""),
      company: String(formData.get("company") ?? ""),
      packageId
    }

    setState({ status: "submitting" })

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setState({
          status: "error",
          message:
            getErrorMessage(payload) ?? "We couldn't send your booking request. Please try again."
        })
        return
      }

      formRef.current?.reset()
      setState({ status: "success" })
      onSuccess?.()
    } catch {
      setState({
        status: "error",
        message: "Network error. Please check your connection and try again."
      })
    }
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center"
      >
        <p className="text-lg font-bold text-primary">Booking request sent — thank you!</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve received your details and will reply within 24 hours.
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
    )
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-8 space-y-5">
      {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}

      {packageTitle ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium text-foreground">
          Package: {packageTitle}
        </p>
      ) : null}

      <div className="flex items-center gap-3" aria-hidden="true">
        <span
          className={`h-1.5 flex-1 rounded-full transition ${
            step >= 1 ? "bg-accent" : "bg-muted"
          }`}
        />
        <span
          className={`h-1.5 flex-1 rounded-full transition ${
            step >= 2 ? "bg-accent" : "bg-muted"
          }`}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Step {step} of 2 — {step === 1 ? "Your trip" : "How we reach you"}
      </p>

      <fieldset className="space-y-4" disabled={isSubmitting} hidden={step !== 1}>
        <legend className="sr-only">Trip</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-destination`} className={labelClass}>
              Destination
            </label>
            <Input
              id={`${fieldId}-destination`}
              name="destination"
              placeholder="Seoul, Boracay, Japan…"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-origin`} className={labelClass}>
              Airport of origin
            </label>
            <Input
              id={`${fieldId}-origin`}
              name="airportOfOrigin"
              placeholder="Manila (MNL), Cebu (CEB)…"
              maxLength={200}
            />
          </div>
        </div>

        <fieldset className="space-y-1.5">
          <legend className={labelClass}>Travel dates</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`${fieldId}-from`}
                className="text-xs font-medium text-muted-foreground"
              >
                Departure
              </label>
              <Input id={`${fieldId}-from`} name="travelDateFrom" type="date" min={today} />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${fieldId}-to`}
                className="text-xs font-medium text-muted-foreground"
              >
                Return
              </label>
              <Input id={`${fieldId}-to`} name="travelDateTo" type="date" min={today} />
            </div>
          </div>
        </fieldset>

        <div className="flex items-start gap-3 rounded-lg border border-input bg-background p-3">
          <input
            id={`${fieldId}-flexible`}
            name="flexibleOnPromoDates"
            type="checkbox"
            value="yes"
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <label htmlFor={`${fieldId}-flexible`} className="text-sm text-foreground">
            I&apos;m flexible on dates if it means catching a promo fare
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-adults`} className={labelClass}>
              No. of adults
            </label>
            <Input
              id={`${fieldId}-adults`}
              name="adults"
              type="number"
              min={0}
              max={99}
              defaultValue={2}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-children`} className={labelClass}>
              No. of children
            </label>
            <Input
              id={`${fieldId}-children`}
              name="children"
              type="number"
              min={0}
              max={99}
              defaultValue={0}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-childages`} className={labelClass}>
              Ages of children
            </label>
            <Input
              id={`${fieldId}-childages`}
              name="childAges"
              placeholder="5, 8 and 11"
              maxLength={200}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-traveltype`} className={labelClass}>
            Travel type
          </label>
          <select
            id={`${fieldId}-traveltype`}
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
      </fieldset>

      {step === 1 ? (
        <Button
          type="button"
          onClick={() => setStep(2)}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Continue
        </Button>
      ) : null}

      <fieldset className="space-y-4" disabled={isSubmitting} hidden={step !== 2}>
        <legend className="sr-only">Your contact details</legend>

        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-name`} className={labelClass}>
            Full name
          </label>
          <Input
            id={`${fieldId}-name`}
            name="name"
            autoComplete="name"
            required
            maxLength={120}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
            <Input
              id={`${fieldId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${fieldId}-message`} className={labelClass}>
            Anything else we should know?{" "}
            <span className={optionalClass}>(optional)</span>
          </label>
          <Textarea id={`${fieldId}-message`} name="message" rows={3} maxLength={4000} />
        </div>
      </fieldset>

      {/* Honeypot: hidden from people, tempting to bots. Never rendered visibly. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${fieldId}-company`}>Company (leave blank)</label>
        <input id={`${fieldId}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? "Sending…" : "Send Booking Request"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setStep(1)}
            className="sm:flex-none"
          >
            Back
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        We reply within 24 hours. Your details are only used to plan your trip.
      </p>
    </form>
  )
}
