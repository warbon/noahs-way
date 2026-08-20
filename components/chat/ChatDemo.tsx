"use client"

import { RotateCcw } from "lucide-react"
import { useState } from "react"

import ChatMessages from "@/components/chat/ChatMessages"
import type { ChatEntry } from "@/components/chat/useChat"
import { Button } from "@/components/ui/button"
import { AGENT_GREETING } from "@/lib/ai/agent"
import type { ChatBookingDraft, ChatPackageSummary, GenUiWidget } from "@/lib/ai/genui-types"
import { siteConfig } from "@/lib/site-config"

/**
 * A scripted stand-in for the model.
 *
 * Every widget below is the real component from the real registry, fed the same
 * payload shape the chat route builds — only the model's turn-taking is faked,
 * so what you see here is what a visitor sees.
 */

let counter = 0
function id(prefix: string) {
  counter += 1
  return `${prefix}-${counter}`
}

function assistant(text: string): ChatEntry {
  return { kind: "message", id: id("a"), role: "assistant", text }
}

function user(text: string): ChatEntry {
  return { kind: "message", id: id("u"), role: "user", text }
}

function widget(w: GenUiWidget): ChatEntry {
  return { kind: "widget", id: w.id, widget: w, answered: false }
}

export default function ChatDemo({ packages }: { packages: ChatPackageSummary[] }) {
  const [entries, setEntries] = useState<ChatEntry[]>([
    { kind: "message", id: "greeting", role: "assistant", text: AGENT_GREETING }
  ])
  const [draft, setDraft] = useState<Partial<ChatBookingDraft>>({})
  const [step, setStep] = useState(0)
  /** True while redoing one answer, so the script skips back to the recap. */
  const [revisiting, setRevisiting] = useState(false)

  function append(...next: ChatEntry[]) {
    setEntries((current) => [...current, ...next])
  }

  function answer(widgetId: string) {
    setEntries((current) =>
      current.map((entry) =>
        entry.kind === "widget" && entry.id === widgetId ? { ...entry, answered: true } : entry
      )
    )
  }

  function start() {
    setStep(1)
    append(
      user("I want a 5-day trip to Korea for 2 adults"),
      assistant(
        "Let me look at what we have. Here are the closest matches from our current catalog."
      ),
      widget({
        id: id("w"),
        name: "show_package_picker",
        payload: {
          intro: "Three that fit a five-day window — tap one to build the request around it.",
          packages
        }
      })
    )
  }

  function showSummary(next: ChatBookingDraft) {
    setRevisiting(false)
    setStep(5)
    append(
      assistant("Here's everything — check it over and confirm when you're happy."),
      widget({
        id: id("w"),
        name: "show_booking_summary",
        payload: {
          prompt: "Your booking request:",
          draft: next,
          packageTitle: packages.find((pkg) => pkg.id === next.packageId)?.title
        }
      })
    )
  }

  function reset() {
    setStep(0)
    setRevisiting(false)
    setDraft({})
    setEntries([{ kind: "message", id: id("greeting"), role: "assistant", text: AGENT_GREETING }])
  }

  function onWidgetSubmit({ id: widgetId, tool, value }: { id: string; tool: string; value: unknown }) {
    answer(widgetId)
    const input = (value ?? {}) as Record<string, unknown>

    if (tool === "show_package_picker") {
      const next = { ...draft, packageId: String(input.packageId ?? "") } as ChatBookingDraft
      setDraft(next)

      if (revisiting) {
        showSummary(next)
        return
      }

      setStep(2)
      append(
        assistant(`Good choice — ${String(input.title ?? "that one")}. When would you like to travel?`),
        widget({
          id: id("w"),
          name: "show_travel_date_picker",
          payload: { prompt: "Pick your dates, or tick the promo option if you're flexible." }
        })
      )
      return
    }

    if (tool === "show_travel_date_picker") {
      const next = {
        ...draft,
        travelDateFrom: input.travelDateFrom as string | undefined,
        travelDateTo: input.travelDateTo as string | undefined,
        flexibleOnPromoDates: input.flexibleOnPromoDates === true
      } as ChatBookingDraft
      setDraft(next)

      if (revisiting) {
        showSummary(next)
        return
      }

      setStep(3)
      append(
        assistant("Noted. How many of you are going?"),
        widget({
          id: id("w"),
          name: "show_traveller_selector",
          payload: { prompt: "Children's ages matter for pricing, so add them if any are coming." }
        })
      )
      return
    }

    if (tool === "show_traveller_selector") {
      const next = {
        ...draft,
        adults: input.adults as number,
        children: input.children as number,
        childAges: input.childAges as string | undefined
      } as ChatBookingDraft
      setDraft(next)

      if (revisiting) {
        showSummary(next)
        return
      }

      setStep(4)
      append(
        assistant("Last thing — how should a consultant reach you?"),
        widget({
          id: id("w"),
          name: "show_contact_form",
          payload: { prompt: "We reply within 24 hours during office hours." }
        })
      )
      return
    }

    if (tool === "show_contact_form") {
      const next: ChatBookingDraft = {
        ...(draft as ChatBookingDraft),
        name: String(input.name ?? ""),
        mobile: String(input.mobile ?? ""),
        email: String(input.email ?? "")
      }
      setDraft(next)
      showSummary(next)
      return
    }

    if (tool === "show_booking_summary") {
      if (input.confirmed === true) {
        setStep(6)
        append(
          assistant(
            `Sent — your reference is inq-demo-0001. A travel consultant will confirm availability and the final price within 24 hours. If you'd rather talk to someone now, call ${siteConfig.phone}.`
          )
        )
      } else {
        setStep(1)
        append(
          assistant("No problem — what would you like to change?"),
          widget({
            id: id("w"),
            name: "show_quick_replies",
            payload: {
              prompt: "Pick the part you want to redo.",
              options: ["The dates", "The travellers", "The package"]
            }
          })
        )
      }
      return
    }

    // Re-opens whichever step the visitor asked to redo. In the live assistant
    // the model decides this; here the mapping is fixed so the demo cannot
    // dead-end the way it would if a branch had nowhere to go.
    if (tool === "show_quick_replies") {
      const choice = String(input.choice ?? "")
      setRevisiting(true)

      if (choice === "The dates") {
        setStep(2)
        append(
          assistant("Sure — pick your dates again."),
          widget({
            id: id("w"),
            name: "show_travel_date_picker",
            payload: { prompt: "Pick your dates, or tick the promo option if you're flexible." }
          })
        )
        return
      }

      if (choice === "The travellers") {
        setStep(3)
        append(
          assistant("No problem — how many of you are going?"),
          widget({
            id: id("w"),
            name: "show_traveller_selector",
            payload: { prompt: "Children's ages matter for pricing, so add them if any are coming." }
          })
        )
        return
      }

      setStep(1)
      append(
        assistant("Here are the options again."),
        widget({
          id: id("w"),
          name: "show_package_picker",
          payload: { intro: "Tap a different one.", packages }
        })
      )
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Development preview
        </p>
        <h1 className="mt-2 text-2xl font-bold text-primary">Booking assistant walkthrough</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The real widgets and real catalog data, driven by a fixed script instead of the model.
          Nothing here calls an API or creates a lead — it exists to review the flow without
          spending a request. This page does not exist in production.
        </p>
      </header>

      <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-primary">Booking assistant</h2>
            <p className="text-xs text-muted-foreground">Step {step} of 6</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restart
          </Button>
        </div>

        <ChatMessages entries={entries} isStreaming={false} onWidgetSubmit={onWidgetSubmit} />

        <div className="border-t border-border px-4 py-3">
          {step === 0 ? (
            <Button type="button" className="w-full" onClick={start}>
              Send: &ldquo;I want a 5-day trip to Korea for 2 adults&rdquo;
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              {step === 6
                ? "Conversation complete. Restart to run it again."
                : "Answer the widget above to continue the script."}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
