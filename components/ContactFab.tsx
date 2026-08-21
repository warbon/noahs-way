import { MessageCircle, Phone } from "lucide-react"

import ChatLauncher from "@/components/chat/ChatLauncher"
import { isAgentAvailable } from "@/lib/ai/config"
import { messengerHref, phoneHref } from "@/lib/site-config"

/**
 * The single bottom-right action stack.
 *
 * Replaces the Facebook customer-chat SDK. That SDK loaded Meta tracking on
 * every page view with no consent gate; a plain m.me link reaches the same
 * inbox with no third-party script.
 *
 * When the AI assistant is configured it takes the Messenger button's place
 * rather than sitting beside it — two chat bubbles in one corner is a choice
 * nobody wants to make. Messenger is not lost: the assistant panel's footer
 * links to it and to the phone number, so the human escape hatch is one tap
 * away from inside the conversation. With the assistant switched off in the
 * admin panel, or with no provider key set anywhere, this falls back to the
 * original Messenger button.
 */
export default async function ContactFab() {
  const assistantAvailable = await isAgentAvailable()

  return (
    <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex flex-col gap-3">
      <a
        href={phoneHref}
        aria-label="Call us"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 md:hidden"
      >
        <Phone className="h-5 w-5" aria-hidden="true" />
      </a>

      {assistantAvailable ? (
        <ChatLauncher />
      ) : (
        <a
          href={messengerHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Message us on Facebook Messenger"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition hover:bg-accent/90"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
