"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"

/**
 * A one-time nudge from the bot, offering help before anyone has to guess what
 * the button does.
 *
 * Deliberately restrained: it waits a few seconds so it never lands mid page
 * load, retires itself after a while, and remembers a dismissal for the rest of
 * the session. A prompt that reappears on every navigation stops being an offer
 * and becomes an advert.
 */

const STORAGE_KEY = "noahsway.chat-invite-seen"
const APPEAR_AFTER_MS = 3500
const RETIRE_AFTER_MS = 16000

export default function ChatInvite({
  open,
  onAccept
}: {
  /** The panel's state — the invite has no business showing over an open chat. */
  open: boolean
  onAccept: () => void
}) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Read in an effect, not during render: sessionStorage does not exist on
    // the server and would break hydration.
    let alreadySeen = true
    try {
      alreadySeen = window.sessionStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      // Private mode or blocked storage — show it, just don't remember.
      alreadySeen = false
    }

    if (alreadySeen) return

    setDismissed(false)
    const show = window.setTimeout(() => setVisible(true), APPEAR_AFTER_MS)
    const hide = window.setTimeout(() => setVisible(false), APPEAR_AFTER_MS + RETIRE_AFTER_MS)

    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])

  function remember() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* nothing to do — the invite simply shows again next page */
    }
  }

  function dismiss() {
    setVisible(false)
    setDismissed(true)
    remember()
  }

  if (dismissed || !visible || open) return null

  return (
    <div
      className="assistant-invite absolute right-full top-1/2 mr-3 flex w-[min(15rem,calc(100vw-6rem))] -translate-y-1/2 items-start gap-2 rounded-2xl rounded-br-md px-3.5 py-2.5 text-left"
      role="status"
    >
      <button
        type="button"
        onClick={() => {
          remember()
          setVisible(false)
          onAccept()
        }}
        className="flex-1 text-[13px] font-medium leading-snug text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        Need help finding a trip? I can search our packages and start your booking.
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss the assistant's message"
        className="-mr-1 -mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
