import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PackageGallery from "@/components/PackageGallery"
import { destinations, findDestination } from "@/lib/destinations"
import { getPackagesByCategory } from "@/lib/package-repository"
import { siteConfig } from "@/lib/site-config"

type PageProps = { params: { slug: string } }

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const destination = findDestination(params.slug)
  if (!destination) return { title: "Destination not found" }

  return {
    title: `${destination.name} tours from the Philippines`,
    description: destination.summary,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: {
      title: `${destination.name} tours from the Philippines`,
      description: destination.summary,
      url: `${siteConfig.url}/destinations/${destination.slug}`
    }
  }
}

export default async function DestinationPage({ params }: PageProps) {
  noStore()

  const destination = findDestination(params.slug)
  if (!destination) notFound()

  const [local, international] = await Promise.all([
    getPackagesByCategory("local"),
    getPackagesByCategory("international")
  ])

  // Matched rather than hand-listed, so a new package lands here on publish.
  const packages = [...international, ...local].filter((pkg) =>
    destination.match.test(`${pkg.title} ${pkg.destination ?? ""}`)
  )

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
              <li>
                <Link href="/destinations" className="hover:underline">
                  Destinations
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                {destination.name}
              </li>
            </ol>
          </nav>

          <header className="mt-6 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              {destination.tagline}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-5xl">
              {destination.name} from the Philippines
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">{destination.summary}</p>
          </header>

          {/* The visa position first — it is the question that decides the trip. */}
          <section
            aria-labelledby="visa-heading"
            className={`mt-8 rounded-2xl border p-5 ${
              destination.visa.needed
                ? "border-primary/15 bg-muted/50"
                : "border-emerald-600/30 bg-emerald-600/5"
            }`}
          >
            <h2 id="visa-heading" className="text-sm font-bold text-primary">
              {destination.visa.needed ? "You will need a visa" : "No visa needed"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {destination.visa.line}{" "}
              <Link
                href="/guides/before-you-fly-filipino-travellers"
                className="font-medium text-primary underline underline-offset-4"
              >
                What every Filipino traveller needs
              </Link>{" "}
              covers the detail.
            </p>
          </section>

          <section aria-labelledby="like-heading" className="mt-12">
            <h2 id="like-heading" className="text-2xl font-bold text-primary">
              What it is like
            </h2>
            <ul className="mt-4 max-w-prose space-y-3 text-foreground/90">
              {destination.whatItIsLike.map((line) => (
                <li key={line} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="when-heading" className="mt-12">
            <h2 id="when-heading" className="text-2xl font-bold text-primary">
              When to go
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {destination.whenToGo.map((entry) => (
                <div
                  key={entry.season}
                  className="rounded-2xl border border-primary/10 bg-card p-5"
                >
                  <dt className="font-bold text-primary">{entry.season}</dt>
                  <dd className="mt-1.5 text-sm text-muted-foreground">{entry.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="packages-heading" className="mt-12">
            <h2 id="packages-heading" className="text-2xl font-bold text-primary">
              Our {destination.name} trips
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">
              {destination.goodFor}
            </p>

            {packages.length > 0 ? (
              <div className="mt-6">
                <PackageGallery
                  packages={packages}
                  layout="grid"
                  reveal
                  gridClassName="sm:grid-cols-2"
                />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-primary/20 bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled for {destination.name} right now.{" "}
                  <Link href="/#contact" className="font-semibold text-primary underline">
                    Tell us when you want to go
                  </Link>{" "}
                  and we will put something together.
                </p>
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
