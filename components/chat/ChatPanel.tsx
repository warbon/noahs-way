"use client"

import { Send, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import BotAvatar from "@/components/chat/BotAvatar"
import ChatMessages from "@/components/chat/ChatMessages"
import { useChat } from "@/components/chat/useChat"
import { Button } from "@/components/ui/button"
import { siteConfig, messengerHref, phoneHref } from "@/lib/site-config"

const MAX_MESSAGE_LENGTH = 2000

/** Must match the assistant-panel-out duration in globals.css. */
const EXIT_DURATION_MS = 220

/**
 * The assistant surface. Portalled to <body> for the same reason as
 * AdminSidePanel — no ancestor transform can clip it — and it stays mounted
 * through its exit animation so closing reads as deliberate rather than as the
 * panel blinking out.
 */
export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, isStreaming, status, sendMessage, submitWidget } = useChat()
  const [draft, setDraft] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [isRendered, setIsRendered] = useState(open)
  const [isClosing, setIsClosing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  /**
   * Below the sm breakpoint the panel fills the viewport and genuinely is
   * modal. Above it, it is a corner popover and the page behind stays usable —
   * so aria-modal, the focus trap and the scroll lock all apply only there.
   * Declaring aria-modal on the desktop layout would tell a screen reader the
   * rest of the page is hidden when it is not.
   */
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      setIsClosing(false)
      setIsRendered(true)
      return
    }

    if (!isRendered) return

    setIsClosing(true)
    const timer = window.setTimeout(() => {
      setIsRendered(false)
      setIsClosing(false)
    }, EXIT_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [open, isRendered])

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const update = () => setIsFullScreen(query.matches)

    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  /**
   * Focus in on open, and back to whatever opened it on close.
   *
   * Depends on isRendered as well as open: the panel returns null until the
   * mount effect flips it, so on the `open` render alone inputRef is still
   * null and the focus call silently does nothing.
   */
  useEffect(() => {
    if (!open || !isRendered) return

    const opener = document.activeElement as HTMLElement | null
    inputRef.current?.focus()

    return () => opener?.focus()
  }, [open, isRendered])

  useEffect(() => {
    if (!open) return

    if (isFullScreen) document.body.style.overflow = "hidden"

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.offsetParent !== null)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
        return
      }

      // Only trapped while the panel actually covers the page.
      if (!isFullScreen || event.key !== "Tab") return

      const items = focusables()
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, onClose, isFullScreen])

  if (!isRendered || !isMounted) return null

  function submitDraft() {
    const text = draft.trim()
    if (!text || isStreaming) return

    setDraft("")
    void sendMessage(text)
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal={isFullScreen ? "true" : undefined}
      aria-label={`${siteConfig.shortName} booking assistant`}
      data-state={isClosing ? "closed" : "open"}
      className="assistant-panel assistant-glass assistant-sheen fixed inset-0 z-50 flex origin-bottom-right flex-col overflow-hidden sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(620px,calc(100vh-8rem))] sm:w-[min(480px,calc(100vw-2.5rem))] sm:rounded-3xl"
    >
      {/* Gradient header, matching the launcher it grew out of. */}
      <header className="assistant-glass-dark relative z-10 flex items-start justify-between gap-3 px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent"
            aria-hidden="true"
          >
            <BotAvatar className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">Booking assistant</h2>
            <p className="truncate text-xs text-primary-foreground/70">
              Finds a package and sends your request — no payment
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the booking assistant"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground/70 transition hover:bg-white/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <ChatMessages
        entries={entries}
        isStreaming={isStreaming}
        status={status}
        onWidgetSubmit={(submission) =>
          // The hook re-narrows this by tool name; ChatMessages only routes it.
          void submitWidget(submission as Parameters<typeof submitWidget>[0])
        }
      />

      <footer className="relative z-10 border-t border-white/40 bg-white/25 px-4 py-3 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Where would you like to go?"
            disabled={isStreaming}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line — chat convention.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                submitDraft()
              }
            }}
            className="assistant-glass-soft max-h-32 min-h-[40px] flex-1 resize-y rounded-2xl px-3.5 py-2 text-sm ring-offset-background transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          />
          <Button
            type="button"
            size="icon"
            aria-label="Send message"
            disabled={isStreaming || !draft.trim()}
            onClick={submitDraft}
            className="assistant-send h-10 w-10 shrink-0 rounded-full"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Prefer a person?{" "}
          <a
            href={messengerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Messenger
          </a>{" "}
          or{" "}
          <a href={phoneHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {siteConfig.phone}
          </a>
          . Never share card or bank details in chat.
        </p>
      </footer>
    </div>,
    document.body
  )
}
