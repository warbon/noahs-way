import Image from "next/image"
import Link from "next/link"

import { formatPricePHP } from "@/lib/price"
import type { StayRecord } from "@/lib/stay-repository-types"
import { buildStayHref } from "@/lib/stay-slug"
import { deriveSlug } from "@/lib/slug"

type StayFeatureProps = {
  stay: StayRecord
}

/**
 * The single-unit treatment for the homepage.
 *
 * A card grid is a way of comparing things, and with one unit there is nothing
 * to compare — the row just reads as a catalog that failed to load. When there
 * is only one, the page stops presenting a list and presents the unit: the
 * photography at a size worth looking at, the facts spelled out rather than
 * compressed into pills, and one obvious way in.
 *
 * It takes the place of the grid rather than sitting beside it, so a second
 * unit going live silently restores the normal row.
 */
export default function StayFeature({ stay }: StayFeatureProps) {
  const slug = deriveSlug(stay, "stay")
  const currency = stay.currency ?? "PHP"
  const href = buildStayHref(slug)
  const gallery = stay.gallery?.filter(Boolean).slice(0, 2) ?? []

  const facts = [
    stay.bedrooms === 0
      ? { label: "Layout", value: "Studio" }
      : { label: "Bedrooms", value: String(stay.bedrooms) },
    { label: "Sleeps", value: `${stay.maxGuests} guest${stay.maxGuests === 1 ? "" : "s"}` },
    stay.baths ? { label: "Bathrooms", value: String(stay.baths) } : null,
    stay.floorArea ? { label: "Floor area", value: `${stay.floorArea} sqm` } : null,
    stay.minimumNights && stay.minimumNights > 1
      ? { label: "Minimum stay", value: `${stay.minimumNights} nights` }
      : null
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <article className="overflow-hidden rounded-[28px] border border-primary/10 bg-background shadow-xl shadow-primary/5">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-2 p-2">
          <Link
            href={href}
            className="group relative block h-64 overflow-hidden rounded-[22px] bg-primary sm:h-80 lg:h-[26rem]"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Image
              src={stay.previewImage}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="media-fade object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-black/45 px-3.5 py-1.5 text-sm font-bold text-white backdrop-blur-[2px]">
              {formatPricePHP(stay.nightlyRate, currency)} / night
            </span>
          </Link>

          {/*
            The extra photos come along, small. One image of a condo answers
            almost nothing — the second and third are what tell a guest whether
            the bedroom and the view are worth the rate.
          */}
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {gallery.map((src) => (
                <div
                  key={src}
                  className="relative h-24 overflow-hidden rounded-[18px] bg-primary sm:h-28"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 50vw, 28vw"
                    className="media-fade object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-center p-7 lg:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">
            {stay.building ? `${stay.city} — ${stay.building}` : stay.city}
          </p>

          <h3 className="mt-3 text-2xl font-bold leading-tight text-primary md:text-3xl">
            <Link href={href} className="hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {stay.title}
            </Link>
          </h3>

          <p className="mt-3 text-muted-foreground">{stay.summary ?? stay.details}</p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {fact.label}
                </dt>
                <dd className="mt-1 font-bold text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {stay.amenities?.length ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {stay.amenities.slice(0, 5).map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                >
                  {amenity}
                </li>
              ))}
              {stay.amenities.length > 5 ? (
                <li className="px-1 py-1 text-xs text-muted-foreground">
                  +{stay.amenities.length - 5} more
                </li>
              ) : null}
            </ul>
          ) : null}

          <div className="mt-7">
            <Link
              href={href}
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              View unit &amp; dates
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
