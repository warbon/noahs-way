import Reveal from "@/components/Reveal"
import StayCard from "@/components/StayCard"
import { cn } from "@/lib/utils"
import type { StayRecord } from "@/lib/stay-repository-types"
import { deriveSlug } from "@/lib/slug"

type StayGridProps = {
  stays: StayRecord[]
  className?: string
  /** Staggered fade-in. Off for search results, which the visitor asked for. */
  reveal?: boolean
  sizes?: string
}

/**
 * Columns follow the number of units, rather than being fixed at three.
 *
 * A three-column grid holding one card leaves it stranded in the left third
 * under a full-width heading, with two thirds of empty space beside it — which
 * reads as a page that failed to load the rest. Until the catalog is deep
 * enough to fill a row, the grid narrows to match what is actually in it and
 * centres, so one unit looks deliberate instead of broken.
 *
 * The widths are capped as well as centred: a single card stretched across the
 * full container would tower over the package cards on the same page.
 */
function layoutFor(count: number) {
  if (count <= 1) return "mx-auto max-w-sm"
  if (count === 2) return "mx-auto max-w-3xl sm:grid-cols-2"
  return "md:grid-cols-2 xl:grid-cols-3"
}

/** A lone card is rendered at card width, so it needs a tighter sizes hint. */
function sizesFor(count: number) {
  if (count <= 1) return "(max-width: 640px) 100vw, 384px"
  if (count === 2) return "(max-width: 640px) 100vw, 50vw"
  return "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
}

export default function StayGrid({ stays, className, reveal = false, sizes }: StayGridProps) {
  return (
    <div className={cn("grid gap-7", layoutFor(stays.length), className)}>
      {stays.map((stay, index) => {
        const card = <StayCard stay={stay} sizes={sizes ?? sizesFor(stays.length)} />
        const key = `${stay.id}-${deriveSlug(stay, "stay")}`

        return reveal ? (
          <Reveal key={key} delay={index * 120}>
            {card}
          </Reveal>
        ) : (
          <div key={key}>{card}</div>
        )
      })}
    </div>
  )
}
