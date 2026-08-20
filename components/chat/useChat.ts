"use client"

import { useCallback, useRef, useState } from "react"

import { AGENT_GREETING } from "@/lib/ai/agent"
import {
  isGenUiToolName,
  type GenUiResultMap,
  type GenUiToolName,
  type GenUiWidget
} from "@/lib/ai/genui-types"

export type ChatEntry =
  | { kind: "message"; id: string; role: "user" | "assistant"; text: string }
  | { kind: "widget"; id: string; widget: GenUiWidget; answered: boolean }
  | { kind: "notice"; id: string; text: string }

type WidgetSubmission = {
  [K in GenUiToolName]: { id: string; tool: K; value: GenUiResultMap[K] }
}[GenUiToolName]

let entryCounter = 0
function nextId(prefix: string) {
  entryCounter += 1
  return `${prefix}-${entryCounter}`
}

/**
 * Owns the conversation on the client: posts a turn, reads the NDJSON stream,
 * and keeps the rendered transcript in step with it.
 *
 * The server holds the authoritative history — everything here is presentation,
 * which is why nothing in this file is ever sent back as conversation context.
 */
export function useChat() {
  const [entries, setEntries] = useState<ChatEntry[]>([
    { kind: "message", id: "greeting", role: "assistant", text: AGENT_GREETING }
  ])
  const [isStreaming, setIsStreaming] = useState(false)
  /** Ephemeral progress label from the server, e.g. "Searching packages…". */
  const [status, setStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const markAnswered = useCallback((widgetId: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.kind === "widget" && entry.id === widgetId ? { ...entry, answered: true } : entry
      )
    )
  }, [])

  const runTurn = useCallback(async (body: Record<string, unknown>) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsStreaming(true)
    setStatus(null)

    const assistantId = nextId("assistant")
    let assistantStarted = false

    function appendText(chunk: string) {
      setEntries((current) => {
        if (!assistantStarted) return current
        return current.map((entry) =>
          entry.kind === "message" && entry.id === assistantId
            ? { ...entry, text: entry.text + chunk }
            : entry
        )
      })
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      if (!response.ok || !response.body) {
        const message = await response
          .json()
          .then((data: { error?: string }) => data.error)
          .catch(() => undefined)

        setEntries((current) => [
          ...current,
          {
            kind: "notice",
            id: nextId("notice"),
            text: message ?? "Something went wrong. Please try again."
          }
        ])
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      // NDJSON: one JSON event per line, so a partial trailing line is held
      // back until the next chunk completes it.
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue

          let event: { t: string; v?: string; id?: string; name?: string; payload?: unknown }
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }

          if (event.t === "status" && typeof event.v === "string") {
            setStatus(event.v || null)
          } else if (event.t === "text" && typeof event.v === "string") {
            if (!assistantStarted) {
              assistantStarted = true
              setEntries((current) => [
                ...current,
                { kind: "message", id: assistantId, role: "assistant", text: "" }
              ])
            }
            appendText(event.v)
          } else if (event.t === "ui" && event.id && isGenUiToolName(event.name)) {
            const widget = {
              id: event.id,
              name: event.name,
              payload: event.payload
            } as GenUiWidget

            setEntries((current) => [
              ...current,
              { kind: "widget", id: widget.id, widget, answered: false }
            ])
          } else if (event.t === "error" && typeof event.v === "string") {
            const text = event.v
            setEntries((current) => [...current, { kind: "notice", id: nextId("notice"), text }])
          }
        }
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return

      setEntries((current) => [
        ...current,
        {
          kind: "notice",
          id: nextId("notice"),
          text: "We lost the connection. Please try again, or message us on Messenger."
        }
      ])
    } finally {
      setIsStreaming(false)
      setStatus(null)
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setEntries((current) => [
        ...current,
        { kind: "message", id: nextId("user"), role: "user", text: trimmed }
      ])

      await runTurn({ message: trimmed })
    },
    [isStreaming, runTurn]
  )

  const submitWidget = useCallback(
    async (submission: WidgetSubmission) => {
      if (isStreaming) return

      // The recap's Confirm button is the one place a conversation writes
      // anything. It goes to its own route, which reads the draft the server
      // staged — the value below is only used to tell the assistant what
      // happened afterwards.
      if (submission.tool === "show_booking_summary") {
        const value = submission.value as GenUiResultMap["show_booking_summary"]

        if (!value.confirmed) {
          markAnswered(submission.id)
          await runTurn({ widgetResult: { tool: submission.tool, value } })
          return
        }

        setIsStreaming(true)
        let reference: string | undefined
        try {
          const response = await fetch("/api/chat/booking", { method: "POST" })
          const data = (await response.json().catch(() => ({}))) as {
            reference?: string
            error?: string
          }

          if (!response.ok) {
            setEntries((current) => [
              ...current,
              {
                kind: "notice",
                id: nextId("notice"),
                text: data.error ?? "We couldn't send that booking request. Please try again."
              }
            ])
            return
          }

          reference = data.reference
        } catch {
          setEntries((current) => [
            ...current,
            {
              kind: "notice",
              id: nextId("notice"),
              text: "We couldn't reach the server. Please try again, or message us on Messenger."
            }
          ])
          return
        } finally {
          setIsStreaming(false)
        }

        markAnswered(submission.id)
        await runTurn({
          widgetResult: { tool: submission.tool, value: { confirmed: true, reference } }
        })
        return
      }

      markAnswered(submission.id)
      await runTurn({ widgetResult: { tool: submission.tool, value: submission.value } })
    },
    [isStreaming, markAnswered, runTurn]
  )

  return { entries, isStreaming, status, sendMessage, submitWidget }
}
