import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PackageGallery from "@/components/PackageGallery"
import Reveal from "@/components/Reveal"
import { publishedGuides } from "@/lib/guides"
import { getPackagesByCategory } from "@/lib/package-repository"
import { practicalities, regions } from "@/lib/philippines"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Travelling around the Philippines",
  description:
    "Where to go and when, region by region — no passport, no visa, and a weather map that varies more than most people plan for.",
  alternates: { canonical: "/philippines" },
  openGraph: {
    title: "Travelling around the Philippines",
    description:
      "Where to go and when, region by region — no passport, no visa, and a weather map that varies more than most people plan for.",
    url: `${siteConfig.url}/philippines`
  }
}

/** The domestic guides, surfaced here rather than making the reader hunt. */
const DOMESTIC_GUIDE_SLUGS = ["when-to-go-where-philippines", "philippine-island-fees"]

export default async function PhilippinesPage() {
  noStore()

  const local = await getPackagesByCategory("local")
  const guides = publishedGuides().filter((guide) => DOMESTIC_GUIDE_SLUGS.includes(guide.slug))

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        {/* A country page, not a package listing — so it opens on the place. */}
        <section className="relative overflow-hidden bg-primary px-5 py-16 md:px-8 md:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,#0b1b34_0%,#132D4E_48%,#1c3c66_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(235,167,51,0.22),transparent_42%)]" />

          <div className="relative mx-auto max-w-5xl">
            <nav aria-label="Breadcrumb" className="text-sm text-white/60">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:underline">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/90">
                  Philippines
                </li>
              </ol>
            </nav>

            <Reveal>
              <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-secondary">
                Home ground
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] text-white md:text-6xl">
                7,000 islands, four very different regions.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/85">
                The easiest trip you can take — no passport, no visa, no travel tax — and the one
                most often planned badly, because the country does not have a single season. When
                you go should decide where you go.
              </p>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-16">
          <section aria-labelledby="regions-heading">
            <h2 id="regions-heading" className="text-3xl font-bold text-primary">
              Where to go
            </h2>
            <p className="mt-3 max-w-prose text-muted-foreground">
              Four regions that behave differently enough to be treated as separate countries when
              you are picking dates.
            </p>

            <div className="mt-8 space-y-6">
              {regions.map((region, index) => (
                <Reveal key={region.name} delay={index * 90}>
                  <article className="rounded-2xl border border-primary/10 bg-card p-6 md:p-7">
                    <h3 className="text-xl font-bold text-primary">{region.name}</h3>
                    <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
                      {region.known}
                    </p>

                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                      {region.places.map((place) => (
                        <div key={place.name} className="border-l-2 border-accent/40 pl-3">
                          <dt className="text-sm font-semibold text-foreground">{place.name}</dt>
                          <dd className="text-sm text-muted-foreground">{place.note}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mt-5 border-t border-border pt-4 text-sm">
                      <span className="font-semibold text-primary">Best months — </span>
                      <span className="text-muted-foreground">{region.bestMonths}</span>
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section aria-labelledby="practical-heading" className="mt-16">
            <h2 id="practical-heading" className="text-3xl font-bold text-primary">
              What to know before you book
            </h2>
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              {practicalities.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-primary/10 bg-card p-5"
                >
                  <dt className="font-bold text-primary">{item.title}</dt>
                  <dd className="mt-1.5 text-sm text-muted-foreground">{item.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          {guides.length > 0 ? (
            <section aria-labelledby="guides-heading" className="mt-16">
              <h2 id="guides-heading" className="text-3xl font-bold text-primary">
                Read before you go
              </h2>
              <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                {guides.map((guide) => (
                  <li key={guide.slug}>
                    <Link
                      href={`/guides/${guide.slug}`}
                      className="card-hover-lift flex h-full flex-col rounded-2xl border border-primary/10 bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {guide.question}
                      </p>
                      <h3 className="mt-2 text-lg font-bold leading-snug text-primary">
                        {guide.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm text-muted-foreground">{guide.summary}</p>
                      <span className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                        Read the guide
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="trips-heading" className="mt-16">
            <h2 id="trips-heading" className="text-3xl font-bold text-primary">
              Our Philippines trips
            </h2>

            {local.length > 0 ? (
              <div className="mt-8">
                <PackageGallery
                  packages={local}
                  layout="grid"
                  reveal
                  gridClassName="sm:grid-cols-2"
                />
              </div>
            ) : (
              /*
                Says plainly that there is nothing scheduled rather than
                implying otherwise. The page still earns its place — everything
                above it is useful whether or not we sell the trip.
              */
              <div className="mt-8 rounded-2xl border border-primary/15 bg-primary p-7 text-primary-foreground">
                <h3 className="text-xl font-bold">Nothing scheduled domestically right now</h3>
                <p className="mt-2 max-w-prose text-primary-foreground/80">
                  Our published departures are Vietnam and Korea. Domestic trips we build to
                  order — tell us the island, the dates and the group, and we will put together an
                  itinerary and a quote.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/#contact"
                    className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
                  >
                    Plan a domestic trip
                  </Link>
                  <Link
                    href="/packages"
                    className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    See what is running
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
