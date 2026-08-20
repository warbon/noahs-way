"use client"

import { X } from "lucide-react"
import { useState } from "react"

import BotAvatar from "@/components/chat/BotAvatar"
import ChatInvite from "@/components/chat/ChatInvite"
import ChatPanel from "@/components/chat/ChatPanel"

/**
 * Lives inside ContactFab's stack rather than owning its own fixed position, so
 * the phone and back-to-top buttons cannot collide with it.
 *
 * The halo is a decorative sibling rather than a pseudo-element so it can sit
 * behind the button in the stacking order and be driven by the button's own
 * [data-open] state.
 */
export default function ChatLauncher() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="relative flex h-12 w-12 items-center justify-center">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          data-open={open}
          aria-expanded={open}
          aria-label={open ? "Close the booking assistant" : "Open the booking assistant"}
          className="assistant-launcher peer relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-full text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* Both icons stay mounted and crossfade, so neither pops in. */}
          <span className="relative block h-6 w-6">
            <BotAvatar
              className="assistant-icon absolute inset-0 h-6 w-6"
              data-visible={!open}
            />
            <X
              className="assistant-icon absolute inset-0 h-6 w-6"
              data-visible={open}
              aria-hidden="true"
            />
          </span>
        </button>

        <span
          className="assistant-halo pointer-events-none absolute inset-0 rounded-full bg-white"
          aria-hidden="true"
        />

        <ChatInvite open={open} onAccept={() => setOpen(true)} />
      </div>

      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
