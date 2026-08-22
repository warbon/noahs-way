import Image from "next/image"
import { Banknote, CalendarClock, Landmark, Store } from "lucide-react"

import type { PaymentMethod } from "@/lib/site-config"

/**
 * One payment option, as a badge.
 *
 * Renders the provider's own mark when `logo` is set and a neutral icon when it
 * isn't. The icons are stand-ins, not imitations: GCash, Maya and Bayad Center
 * marks are third-party trademarks that have to come from each provider's brand
 * kit, so approximating them here would be both misleading and a licensing
 * problem. Supply the file, set the path, and the badge upgrades itself.
 */

const ICONS = {
  wallet: Banknote,
  instalment: CalendarClock,
  bank: Landmark,
  counter: Store
} as const

type Tone = "light" | "dark"

export default function PaymentBadge({
  method,
  tone = "light"
}: {
  method: PaymentMethod
  tone?: Tone
}) {
  const Icon = ICONS[method.icon]

  const shell =
    tone === "dark"
      ? "border-white/25 bg-white/10 text-white"
      : "border-primary/15 bg-card text-foreground"
  const iconTone = tone === "dark" ? "text-secondary" : "text-accent"

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${shell}`}
    >
      {method.logo ? (
        // Constrained by height so marks of different widths still line up.
        <Image
          src={method.logo}
          alt={method.name}
          width={72}
          height={20}
          className="h-5 w-auto"
        />
      ) : (
        <>
          <Icon className={`h-4 w-4 shrink-0 ${iconTone}`} aria-hidden="true" />
          {method.name}
        </>
      )}
    </span>
  )
}
