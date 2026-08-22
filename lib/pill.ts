import { cn } from "@/lib/utils"

/**
 * The outline "pill" used for category links, catalog filters and pagination.
 *
 * The class string was copy-pasted five times across two files, already drifting
 * — three copies carried `shadow-sm` and `inline-flex`, two didn't. One source
 * keeps them from separating further.
 */
const PILL_BASE =
  "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const PILL_IDLE =
  "border border-primary/15 bg-card text-primary shadow-sm hover:bg-primary hover:text-white"

/** Filled treatment for the currently selected filter. */
const PILL_ACTIVE = "bg-primary text-white shadow-sm"

/** Non-interactive treatment for the dead ends of a paginator. */
const PILL_DISABLED =
  "cursor-not-allowed border border-primary/10 bg-card/70 text-primary/40"

export type PillVariant = "idle" | "active" | "disabled"

export function pill(variant: PillVariant = "idle", className?: string) {
  const variantClass =
    variant === "active" ? PILL_ACTIVE : variant === "disabled" ? PILL_DISABLED : PILL_IDLE

  return cn(PILL_BASE, variantClass, className)
}
