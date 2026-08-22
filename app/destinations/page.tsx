import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { destinations } from "@/lib/destinations"
import { getPackagesByCategory } from "@/lib/package-repository"
import { formatMoney } from "@/lib/package-fees"

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Where we run trips from the Philippines, what each place asks of a Philippine passport, and when to go.",
  alternates: { canonical: "/destinations" }
}

export default async function DestinationsIndexPage() {
  noStore()

  const [local, international] = await Promise.all([
    getPackagesByCategory("local"),
    getPackagesByCategory("international")
  ])
  const all = [...international, ...local]

  const rows = destinations.map((destination) => {
    const matched = all.filter((pkg) =>
      destination.match.test(`${pkg.title} ${pkg.destination ?? ""}`)
    )
    const prices = matched.map((pkg) => pkg.priceAmount).filter((n): n is number => Boolean(n))

    return {
      destination,
      count: matched.length,
      from: prices.length ? Math.min(...prices) : undefined
    }
  })

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                Destinations
              </li>
            </ol>
          </nav>

          <header className="mt-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Destinations
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">
              Still deciding where to go?
            </h1>
            <p className="mt-4 text-muted-foreground">
              What each place asks of a Philippine passport, when the seasons are worth planning
              around, and which of our trips go there.
            </p>
          </header>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {rows.map(({ destination, count, from }) => (
              <li key={destination.slug}>
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="card-hover-lift flex h-full flex-col rounded-2xl border border-primary/10 bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <h2 className="text-2xl font-bold text-primary">{destination.name}</h2>
                  <p className="mt-1 text-sm font-medium text-accent">{destination.tagline}</p>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">
                    {destination.summary}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        destination.visa.needed
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-600/10 text-emerald-700"
                      }`}
                    >
                      {destination.visa.needed ? "Visa required" : "No visa needed"}
                    </span>
                    {count > 0 ? (
                      <span className="rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground">
                        {count} {count === 1 ? "trip" : "trips"}
                        {from ? ` · from ${formatMoney(from)}` : ""}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
