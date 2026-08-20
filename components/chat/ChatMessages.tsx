"use client"

import { useEffect, useRef } from "react"

import GenUiWidgetView from "@/components/chat/genui/registry"
import type { ChatEntry } from "@/components/chat/useChat"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"
import { cn } from "@/lib/utils"

export type WidgetSubmitHandler = (submission: {
  id: string
  tool: string
  value: unknown
}) => void

export default function ChatMessages({
  entries,
  isStreaming,
  status,
  onWidgetSubmit
}: {
  entries: ChatEntry[]
  isStreaming: boolean
  /** Server-sent progress label; null between steps. */
  status?: string | null
  onWidgetSubmit: WidgetSubmitHandler
}) {
  const endRef = useRef<HTMLDivElement | null>(null)

  // Follow the newest content, including each streamed chunk.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [entries, status])

  return (
    <div className="relative z-10 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {entries.map((entry) => {
        if (entry.kind === "notice") {
          return (
            <p
              key={entry.id}
              role="status"
              className="assistant-entry rounded-xl border border-destructive/25 bg-destructive/15 px-3 py-2 text-xs text-destructive backdrop-blur-md"
            >
              {entry.text}
            </p>
          )
        }

        if (entry.kind === "widget") {
          return (
            <div key={entry.id} className="assistant-widget-in">
              <GenUiWidgetView
              // The union is reassembled inside the registry; this component
              // only routes it.
              {...({
                widget: entry.widget,
                answered: entry.answered,
                disabled: isStreaming,
                onSubmit: (value: unknown) =>
                  onWidgetSubmit({ id: entry.id, tool: entry.widget.name, value })
                } as unknown as GenUiComponentProps)}
              />
            </div>
          )
        }

        const isUser = entry.role === "user"

        return (
          <div
            key={entry.id}
            className={cn("assistant-entry flex", isUser ? "justify-end" : "justify-start")}
          >
            <p
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                isUser
                  ? "assistant-glass-tinted rounded-br-md text-primary-foreground"
                  : "assistant-glass-soft rounded-bl-md text-foreground"
              )}
            >
              {entry.text}
            </p>
          </div>
        )
      })}

      {isStreaming ? (
        <div
          className="assistant-entry flex items-center gap-2"
          role="status"
          aria-label={status ?? "Assistant is typing"}
        >
          <span className="assistant-glass-soft flex items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-3">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="assistant-typing-dot h-1.5 w-1.5 rounded-full bg-foreground/60"
                // Staggered so the dots read as a wave rather than a blink.
                style={{ animationDelay: `${index * 160}ms` }}
              />
            ))}
          </span>
          {status ? (
            <span className="self-center text-xs text-muted-foreground">{status}</span>
          ) : null}
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  )
}
