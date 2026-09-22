import Image from "next/image"
import Link from "next/link"

import PaymentMethods from "@/components/PaymentMethods"
import StayBookingForm from "@/components/StayBookingForm"
import { formatPricePHP } from "@/lib/price"
import { stayMeta } from "@/lib/stay-data"
import type { StayRecord } from "@/lib/stay-repository-types"

type StayDetailViewProps = {
  stay: StayRecord
  /**
   * Renders for an admin reviewing the listing rather than a guest booking it.
   * Shared with the admin preview so the two cannot drift — a preview that is
   * only roughly what guests see is how a unit gets published with a section
   * nobody looked at.
   */
  preview?: boolean
}

export default function StayDetailView({ stay, preview = false }: StayDetailViewProps) {
  const currency = stay.currency ?? "PHP"
  const gallery = stay.gallery?.filter(Boolean) ?? []

  const facts = [
    // A zero-bedroom unit is a studio. "0 bedrooms" is technically accurate and
    // reads like a data-entry error.
    stay.bedrooms === 0
      ? { label: "Layout", value: "Studio" }
      : { label: "Bedrooms", value: String(stay.bedrooms) },
    stay.beds ? { label: "Beds", value: String(stay.beds) } : null,
    stay.baths ? { label: "Bathrooms", value: String(stay.baths) } : null,
    { label: "Sleeps", value: `${stay.maxGuests} guest${stay.maxGuests === 1 ? "" : "s"}` },
    stay.floorArea ? { label: "Floor area", value: `${stay.floorArea} sqm` } : null,
    stay.minimumNights && stay.minimumNights > 1
      ? { label: "Minimum stay", value: `${stay.minimumNights} nights` }
      : null
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main id="main-content" tabIndex={-1} className="px-5 py-12 md:px-8">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/stays" className="hover:underline">
                {stayMeta.title}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {stay.title}
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-bold text-primary md:text-5xl">{stay.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">
              {formatPricePHP(stay.nightlyRate, currency)} / night
            </span>
            <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
              {stay.city}
            </span>
            {stay.building ? (
              <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
                {stay.building}
              </span>
            ) : null}
          </div>
          <p className="mt-4 max-w-2xl text-muted-foreground">{stay.summary ?? stay.details}</p>
        </header>

        <div className="mt-8 overflow-hidden rounded-[26px] border border-primary/10 bg-primary">
          <div className="relative h-72 md:h-[26rem]">
            <Image
              src={stay.imagePath}
              alt={stay.imageAlt ?? `${stay.title} — condo interior`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="media-fade object-cover"
            />
          </div>
        </div>

        {gallery.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((src, index) => (
              <div
                key={src}
                className="relative h-28 overflow-hidden rounded-xl border border-primary/10 bg-primary sm:h-32"
              >
                <Image
                  src={src}
                  alt={`${stay.title} — photo ${index + 2}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="media-fade object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-10">
            <section aria-labelledby="facts-heading">
              <h2 id="facts-heading" className="text-2xl font-bold text-primary">
                The unit
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-2xl border border-border p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 font-bold text-foreground">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {stay.landmark ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Location:</span> {stay.landmark}
                </p>
              ) : null}
            </section>

            {stay.amenities?.length ? (
              <section aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="text-2xl font-bold text-primary">
                  Amenities
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {stay.amenities.map((amenity) => (
                    <li key={amenity} className="flex gap-2 text-sm">
                      <span aria-hidden="true" className="font-bold text-emerald-600">
                        ✓
                      </span>
                      <span>{amenity}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {stay.houseRules?.length || stay.checkInTime || stay.checkOutTime ? (
              <section aria-labelledby="rules-heading">
                <h2 id="rules-heading" className="text-2xl font-bold text-primary">
                  House rules
                </h2>
                {stay.checkInTime || stay.checkOutTime ? (
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Check-in</span>{" "}
                    {stay.checkInTime ?? "on arrangement"} ·{" "}
                    <span className="font-semibold">Check-out</span>{" "}
                    {stay.checkOutTime ?? "on arrangement"}
                  </p>
                ) : null}
                {stay.houseRules?.length ? (
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {stay.houseRules.map((rule) => (
                      <li key={rule} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <PaymentMethods intro="Reserve with a deposit and settle the balance before check-in. We'll confirm the exact schedule when we send your quote." />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <StayBookingForm
              stayId={stay.id}
              stayTitle={stay.title}
              nightlyRate={stay.nightlyRate}
              cleaningFee={stay.cleaningFee}
              currency={currency}
              minimumNights={stay.minimumNights ?? 1}
              maxGuests={stay.maxGuests}
              blocks={stay.blocks}
              availabilityUpdatedAt={stay.availabilityUpdatedAt}
              preview={preview}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
