import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Shared frame for every generative widget, so a control the assistant renders
 * reads as part of the conversation rather than as an embedded form.
 */
export default function WidgetShell({
  prompt,
  answered,
  children,
  className
}: {
  prompt?: string
  answered: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "assistant-glass-soft rounded-2xl p-3 transition-opacity",
        answered && "opacity-70",
        className
      )}
    >
      {prompt ? <p className="mb-3 text-sm text-foreground">{prompt}</p> : null}
      {children}
    </div>
  )
}
