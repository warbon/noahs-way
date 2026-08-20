import { NextRequest, NextResponse } from "next/server"

import { buildSystemPrompt } from "@/lib/ai/agent"
import { findCatalogEntry, toChatPackageSummary } from "@/lib/ai/catalog"
import {
  CHAT_COOKIE_NAME,
  createSessionId,
  getChatTtlSeconds,
  isValidSessionId,
  readTranscript,
  writeBookingDraft,
  writeTranscript
} from "@/lib/ai/chat-store"
import type {
  ChatBookingDraft,
  ChatPackageSummary,
  GenUiToolName,
  GenUiPayloadMap
} from "@/lib/ai/genui-types"
import { getAgentProvider, isAgentConfigured } from "@/lib/ai/provider"
import {
  AGENT_FALLBACK_MESSAGE,
  AgentError,
  type AgentMessage,
  type AgentPart,
  type AgentToolCallPart,
  type AgentToolResultPart
} from "@/lib/ai/provider-types"
import { AGENT_TOOLS, isGenUiTool, runDataTool } from "@/lib/ai/tools"
import { isTravelType } from "@/lib/inquiry-types"
import { checkChatRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-ip"

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 2000
/** Enough for a long booking conversation, bounded so context can't run away. */
const MAX_TRANSCRIPT_MESSAGES = 40
/** One turn may search, fetch details, then render — beyond that it is looping. */
const MAX_TOOL_ITERATIONS = 4

/**
 * Wall-clock ceiling for a single turn, comfortably under `maxDuration`.
 *
 * The iteration cap alone does not bound latency: each iteration is a full
 * model call, so a slow one can still push the response past the platform's
 * function timeout, where it is killed mid-stream and the visitor sees nothing
 * but a failure. Stopping ourselves first means we always get to say something.
 */
const TURN_BUDGET_MS = 40_000

/** Shown when the budget or the iteration cap runs out mid-turn. */
const SLOW_TURN_MESSAGE =
  "That one is taking me longer than it should. Could you narrow it down a little — a destination or a rough budget? Or message us on Messenger and a consultant will pick it up."

/** Progress labels, so a slow turn shows movement instead of silent dots. */
const TOOL_STATUS: Record<string, string> = {
  search_packages: "Searching packages…",
  get_package_details: "Reading the itinerary…"
}

type StreamEvent =
  | { t: "text"; v: string }
  | { t: "status"; v: string }
  | { t: "ui"; id: string; name: GenUiToolName; payload: unknown }
  | { t: "done" }
  | { t: "error"; v: string }

function readString(value: unknown, max = 400) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

function readStringArray(value: unknown, max: number) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => readString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .slice(0, max)
}

function readCount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) return undefined
  return Math.trunc(parsed)
}

function readIsoDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

/**
 * Drops the oldest messages once the transcript grows too long, then keeps
 * dropping until the first message is a plain user turn. Without that second
 * pass a trim can orphan a tool result whose tool call was just removed, which
 * both providers reject.
 */
function trimTranscript(messages: AgentMessage[]): AgentMessage[] {
  let trimmed = messages.slice(-MAX_TRANSCRIPT_MESSAGES)

  while (trimmed.length > 0) {
    const first = trimmed[0]
    if (first.role === "user" && first.parts.every((part) => part.type === "text")) break
    trimmed = trimmed.slice(1)
  }

  return trimmed
}

/**
 * Drops a trailing assistant turn whose tool calls never received results.
 *
 * A turn that throws part-way can leave `tool_use` blocks with no matching
 * `tool_result`, which both providers reject on the next request. Persisting
 * that would poison the conversation permanently, so the incomplete tail is
 * trimmed and any text the assistant did manage to say is kept.
 */
function dropUnansweredToolCalls(messages: AgentMessage[]): AgentMessage[] {
  if (messages.length === 0) return messages

  const last = messages[messages.length - 1]
  if (last.role !== "assistant") return messages

  const hasToolCalls = last.parts.some((part) => part.type === "tool_call")
  if (!hasToolCalls) return messages

  const textOnly = last.parts.filter((part) => part.type === "text")
  return textOnly.length > 0
    ? [...messages.slice(0, -1), { role: "assistant" as const, parts: textOnly }]
    : messages.slice(0, -1)
}

function draftFromToolInput(input: Record<string, unknown>): ChatBookingDraft | undefined {
  const name = readString(input.name, 120)
  const mobile = readString(input.mobile, 40)
  const email = readString(input.email, 200)

  if (!name || !mobile || !email) return undefined

  return {
    name,
    mobile,
    email,
    packageId: readString(input.packageId),
    destination: readString(input.destination, 200),
    airportOfOrigin: readString(input.airportOfOrigin, 200),
    travelDateFrom: readIsoDate(input.travelDateFrom),
    travelDateTo: readIsoDate(input.travelDateTo),
    flexibleOnPromoDates: input.flexibleOnPromoDates === true,
    adults: readCount(input.adults),
    children: readCount(input.children),
    childAges: readString(input.childAges, 200),
    travelType: isTravelType(input.travelType) ? input.travelType : undefined,
    message: readString(input.message, 4000)
  }
}

type GenUiOutcome =
  | { rendered: true; name: GenUiToolName; payload: GenUiPayloadMap[GenUiToolName]; ack: unknown }
  | { rendered: false; ack: unknown }

/**
 * Turns a widget tool call into something safe to render.
 *
 * Anything the visitor will see as fact — package titles, prices, the package
 * name on the recap — is resolved from the catalog here rather than taken from
 * the model's arguments.
 */
async function buildGenUi(
  sessionId: string,
  name: GenUiToolName,
  input: Record<string, unknown>
): Promise<GenUiOutcome> {
  const prompt = readString(input.prompt, 400) ?? ""

  switch (name) {
    case "show_package_picker": {
      const ids = readStringArray(input.packageIds, 4)
      const resolved = await Promise.all(ids.map((id) => findCatalogEntry(id)))
      const packages = resolved
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map(toChatPackageSummary) satisfies ChatPackageSummary[]

      if (packages.length === 0) {
        return {
          rendered: false,
          ack: { error: "None of those packageIds are published. Call search_packages again." }
        }
      }

      return {
        rendered: true,
        name,
        payload: { intro: readString(input.intro, 300) ?? "", packages },
        ack: { displayed: true, shown: packages.map((entry) => entry.title) }
      }
    }

    case "show_travel_date_picker":
    case "show_traveller_selector":
      return { rendered: true, name, payload: { prompt }, ack: { displayed: true } }

    case "show_contact_form": {
      const prefillInput = (input.prefill ?? {}) as Record<string, unknown>
      return {
        rendered: true,
        name,
        payload: {
          prompt,
          prefill: {
            name: readString(prefillInput.name, 120),
            mobile: readString(prefillInput.mobile, 40),
            email: readString(prefillInput.email, 200)
          }
        },
        ack: { displayed: true }
      }
    }

    case "show_quick_replies": {
      const options = readStringArray(input.options, 4)
      if (options.length < 2) {
        return { rendered: false, ack: { error: "Provide at least two options." } }
      }
      return { rendered: true, name, payload: { prompt, options }, ack: { displayed: true } }
    }

    case "show_booking_summary": {
      const draft = draftFromToolInput(input)
      if (!draft) {
        return {
          rendered: false,
          ack: { error: "name, mobile and email are all required before a summary can be shown." }
        }
      }

      const entry = draft.packageId ? await findCatalogEntry(draft.packageId) : undefined
      // Persisted server-side: the Confirm button submits this, never a body
      // the browser supplies.
      await writeBookingDraft(sessionId, draft)

      return {
        rendered: true,
        name,
        payload: { prompt, draft, packageTitle: entry?.title },
        ack: { displayed: true, note: "Awaiting the visitor's Confirm click. You cannot submit it." }
      }
    }
  }
}

/** Renders a completed widget as a plain user turn the model can read. */
function describeWidgetResult(tool: string, value: Record<string, unknown>) {
  switch (tool) {
    case "show_package_picker":
      return `[The visitor selected the package "${readString(value.title) ?? "unknown"}" (packageId: ${readString(value.packageId) ?? "unknown"}).]`
    case "show_travel_date_picker": {
      const from = readIsoDate(value.travelDateFrom) ?? "not given"
      const to = readIsoDate(value.travelDateTo) ?? "not given"
      const flexible = value.flexibleOnPromoDates === true ? "yes" : "no"
      return `[The visitor chose travel dates — departure: ${from}, return: ${to}, flexible for promo fares: ${flexible}.]`
    }
    case "show_traveller_selector": {
      const adults = readCount(value.adults) ?? 0
      const children = readCount(value.children) ?? 0
      const ages = readString(value.childAges, 200)
      return `[The visitor is travelling with ${adults} adult(s) and ${children} child(ren)${ages ? `, ages ${ages}` : ""}.]`
    }
    case "show_contact_form":
      return `[The visitor gave their contact details — name: ${readString(value.name, 120) ?? "?"}, mobile: ${readString(value.mobile, 40) ?? "?"}, email: ${readString(value.email, 200) ?? "?"}.]`
    case "show_quick_replies":
      return readString(value.choice, 400) ?? ""
    case "show_booking_summary":
      return value.confirmed === true
        ? `[The visitor confirmed the booking. Reference: ${readString(value.reference) ?? "unknown"}. It is now with a consultant.]`
        : "[The visitor wants to change something before confirming.]"
    default:
      return ""
  }
}

function readTurnInput(body: Record<string, unknown>) {
  const widgetResult = body.widgetResult
  if (widgetResult && typeof widgetResult === "object") {
    const { tool, value } = widgetResult as Record<string, unknown>
    if (typeof tool === "string" && isGenUiTool(tool)) {
      const described = describeWidgetResult(tool, (value ?? {}) as Record<string, unknown>)
      if (described) return described
    }
    return undefined
  }

  return readString(body.message, MAX_MESSAGE_LENGTH)
}

export async function POST(request: NextRequest) {
  if (!isAgentConfigured()) {
    return NextResponse.json({ error: "The assistant is not available." }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const userText = readTurnInput(payload as Record<string, unknown>)
  if (!userText) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const allowed = await checkChatRateLimit(getClientIp(request.headers))
  if (!allowed) {
    return NextResponse.json(
      { error: "You've sent a lot of messages. Please try again in a few minutes, or message us on Messenger." },
      { status: 429 }
    )
  }

  const existingSessionId = request.cookies.get(CHAT_COOKIE_NAME)?.value
  const sessionId = isValidSessionId(existingSessionId) ? existingSessionId : createSessionId()

  const provider = getAgentProvider()
  const system = buildSystemPrompt()

  const messages = trimTranscript(await readTranscript(sessionId))
  messages.push({ role: "user", parts: [{ type: "text", text: userText }] })

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Once the client disconnects the controller is errored, and enqueueing
      // throws. That throw used to happen inside the catch below, escaping
      // start() unhandled on every aborted turn.
      let closed = false
      function send(event: StreamEvent) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          closed = true
        }
      }

      const startedAt = Date.now()
      let ranOutOfTime = false
      // Set on any iteration that ends the turn deliberately, so an exhausted
      // loop can be told apart from a finished one.
      let settled = false

      try {
        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
          // Checked before spending another call, never mid-stream.
          if (iteration > 0 && Date.now() - startedAt > TURN_BUDGET_MS) {
            ranOutOfTime = true
            break
          }

          let text = ""
          const toolCalls: AgentToolCallPart[] = []

          for await (const event of provider.streamTurn({
            system,
            messages,
            tools: AGENT_TOOLS,
            signal: request.signal
          })) {
            if (event.type === "text_delta") {
              if (!text) send({ t: "status", v: "" })
              text += event.text
              send({ t: "text", v: event.text })
            } else if (event.type === "tool_call") {
              toolCalls.push({
                type: "tool_call",
                id: event.id,
                name: event.name,
                input: event.input
              })
            } else if (event.type === "done" && event.stopReason === "refusal") {
              send({ t: "error", v: AGENT_FALLBACK_MESSAGE })
            }
          }

          const assistantParts: AgentPart[] = []
          if (text) assistantParts.push({ type: "text", text })
          assistantParts.push(...toolCalls)
          if (assistantParts.length > 0) messages.push({ role: "assistant", parts: assistantParts })

          if (toolCalls.length === 0) {
            settled = true
            break
          }

          const toolResults: AgentToolResultPart[] = []
          let waitingOnVisitor = false

          for (const call of toolCalls) {
            if (isGenUiTool(call.name)) {
              const outcome = await buildGenUi(sessionId, call.name, call.input)
              if (outcome.rendered) {
                send({ t: "ui", id: call.id, name: outcome.name, payload: outcome.payload })
                waitingOnVisitor = true
              }
              toolResults.push({
                type: "tool_result",
                toolCallId: call.id,
                content: JSON.stringify(outcome.ack)
              })
            } else {
              const label = TOOL_STATUS[call.name]
              if (label) send({ t: "status", v: label })

              const result = await runDataTool(call.name, call.input)
              toolResults.push({
                type: "tool_result",
                toolCallId: call.id,
                content: JSON.stringify(result)
              })
            }
          }

          messages.push({ role: "user", parts: toolResults })

          // A widget is a question. Calling the model again now would have it
          // talk over a control the visitor has not answered yet.
          if (waitingOnVisitor) {
            settled = true
            break
          }
        }

        send({ t: "status", v: "" })
        // An exhausted iteration cap is as much a dead end as a spent budget;
        // without this the turn ends with no reply and no explanation at all.
        if (ranOutOfTime || !settled) send({ t: "error", v: SLOW_TURN_MESSAGE })
        send({ t: "done" })
      } catch (error) {
        const code = error instanceof AgentError ? error.code : "unknown"
        console.error(`[chat] turn failed (${code})`, error)
        send({ t: "status", v: "" })
        send({ t: "error", v: AGENT_FALLBACK_MESSAGE })
      } finally {
        // Persisted on the failure path too: the visitor can see their message
        // on screen, so a server-side history without it would leave the model
        // answering their follow-up with no idea what they first asked.
        try {
          await writeTranscript(sessionId, dropUnansweredToolCalls(trimTranscript(messages)))
        } catch (error) {
          console.error("[chat] could not persist transcript", error)
        }

        try {
          controller.close()
        } catch {
          /* already closed by the disconnect that got us here */
        }
      }
    }
  })

  const response = new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store"
    }
  })

  response.cookies.set({
    name: CHAT_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getChatTtlSeconds()
  })

  return response
}
