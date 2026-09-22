import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import Reveal from "@/components/Reveal"
import StayFeature from "@/components/StayFeature"
import StayGrid from "@/components/StayGrid"
import { pill } from "@/lib/pill"
import { getStays } from "@/lib/stay-repository"

/**
 * The condo row on the homepage.
 *
 * Renders nothing at all when no unit is published. An empty "Condo Stays"
 * heading on the homepage advertises a service the business cannot currently
 * fulfil, which is worse than the section not existing yet — the same rule the
 * package rows already follow.
 */
export default async function StaysPreview() {
  noStore()

  const stays = await getStays()
  if (stays.length === 0) return null

  const shown = stays.slice(0, 3)
  const hasMore = stays.length > shown.length

  return (
    <section id="stays" className="bg-muted/40 px-5 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Condo Rentals
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-primary md:text-4xl">
            Stay a few nights, not a whole package
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mb-12 mt-3 max-w-2xl text-center text-muted-foreground">
            {stays.length === 1
              ? "A furnished condo unit with a nightly rate, real availability, and the cleaning fee shown before you ask."
              : "Furnished condo units with nightly rates, real availability, and the cleaning fee shown before you ask."}
          </p>
        </Reveal>

        {/*
          One unit is featured rather than listed; two or three go in a row.
          The row is a way of comparing things, and with a single unit there is
          nothing to compare — it just reads as a catalog that failed to load.
        */}
        {stays.length === 1 ? (
          <Reveal>
            <StayFeature stay={stays[0]} />
          </Reveal>
        ) : (
          // Three at most: a taster that earns the click to /stays, not the
          // catalog itself.
          <StayGrid stays={shown} reveal />
        )}

        {/*
          The link only appears once there is something behind it. With three
          units or fewer every one of them is already on this page, so "View
          all condo stays" would carry the visitor to the same cards they are
          looking at — a small lie that costs trust for no gain. Each card is
          its own link, so the section still goes somewhere.
        */}
        {hasMore ? (
          <div className="mt-10 flex justify-center">
            <Link href="/stays" className={pill("idle", "px-5 py-2.5")}>
              View all {stays.length} condo stays
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
