import Image from "next/image"
import Link from "next/link"

import { formatPricePHP } from "@/lib/price"
import type { StayRecord } from "@/lib/stay-repository-types"
import { buildStayHref } from "@/lib/stay-slug"
import { deriveSlug } from "@/lib/slug"

type StayCardProps = {
  stay: StayRecord
  /** Sizes hint for the grid this card sits in. */
  sizes?: string
}

/**
 * Photo on top, facts below — deliberately not the package card's treatment.
 *
 * A package card is a full-bleed poster with the title burned into the artwork
 * and a scrim over it, which works because the posters are designed that way. A
 * condo photo is an ordinary photograph of a room; laying a dark gradient and
 * white type across it hides the thing the guest is trying to look at. The
 * radius, border, shadow and hover lift are shared so the two still read as the
 * same site.
 */
export default function StayCard({ stay, sizes }: StayCardProps) {
  const slug = deriveSlug(stay, "stay")
  const currency = stay.currency ?? "PHP"

  const facts = [
    stay.bedrooms === 0 ? "Studio" : `${stay.bedrooms} ${stay.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    `Sleeps ${stay.maxGuests}`,
    stay.baths ? `${stay.baths} ${stay.baths === 1 ? "bath" : "baths"}` : null
  ].filter(Boolean) as string[]

  return (
    <Link
      href={buildStayHref(slug)}
      className="card-hover-lift group flex h-full flex-col overflow-hidden rounded-[26px] border border-primary/10 bg-background text-left shadow-lg shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative h-56 overflow-hidden bg-primary">
        <Image
          src={stay.previewImage}
          alt={stay.imageAlt ?? `${stay.title} — condo interior`}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"}
          className="media-fade object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-[2px]">
          {formatPricePHP(stay.nightlyRate, currency)} / night
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/60">
          {stay.landmark ? `${stay.city} — ${stay.landmark}` : stay.city}
        </p>
        <h3 className="mt-2 text-xl font-bold leading-tight text-primary">{stay.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{stay.details}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {facts.map((fact) => (
            <li
              key={fact}
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
            >
              {fact}
            </li>
          ))}
        </ul>

        {/* `mt-auto` keeps the CTA on the bottom edge whatever the card above it
            is worth — otherwise a unit with a short title leaves the row ragged. */}
        <span className="mt-auto pt-5 text-sm font-semibold uppercase tracking-[0.14em] text-accent transition group-hover:text-primary">
          View unit &amp; dates
        </span>
      </div>
    </Link>
  )
}
