import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import InquiryForm from "@/components/InquiryForm"
import Navbar from "@/components/Navbar"
import ScrollProgress from "@/components/ScrollProgress"
import { packageCategoryMeta, type PackageCategory } from "@/lib/package-data"
import { getPackagesByCategory } from "@/lib/package-repository"
import type { PackageRecord } from "@/lib/package-repository-types"
import { buildPackageHref, findPackageBySlug } from "@/lib/package-slug"
import { formatDuration, formatPackagePrice } from "@/lib/price"
import { siteConfig } from "@/lib/site-config"

type PageProps = {
  params: { category: string; slug: string }
}

function isPackageCategory(value: string): value is PackageCategory {
  return value === "local" || value === "international"
}

async function resolvePackage(category: string, slug: string) {
  if (!isPackageCategory(category)) return null
  const packages = await getPackagesByCategory(category)
  const match = findPackageBySlug(packages, slug)
  return match ? ({ pkg: match as PackageRecord & { slug: string }, category } as const) : null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await resolvePackage(params.category, params.slug)
  if (!resolved) return { title: "Package not found" }

  const { pkg } = resolved
  const duration = formatDuration(pkg.durationDays, pkg.durationNights)
  const description = pkg.summary ?? pkg.details

  return {
    title: duration ? `${pkg.title} — ${duration}` : pkg.title,
    description,
    alternates: { canonical: buildPackageHref(resolved.category, pkg.slug) },
    openGraph: {
      title: pkg.title,
      description,
      url: `${siteConfig.url}${buildPackageHref(resolved.category, pkg.slug)}`,
      images: pkg.imagePath ? [{ url: pkg.imagePath, alt: pkg.imageAlt ?? pkg.title }] : undefined
    }
  }
}

export default async function PackageDetailPage({ params }: PageProps) {
  noStore()

  const resolved = await resolvePackage(params.category, params.slug)
  if (!resolved) notFound()

  const { pkg, category } = resolved
  const meta = packageCategoryMeta[category]
  const duration = formatDuration(pkg.durationDays, pkg.durationNights)
  const hasItinerary = Boolean(pkg.itinerary?.length)
  const hasInclusions = Boolean(pkg.inclusions?.length || pkg.exclusions?.length)

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: pkg.title,
    description: pkg.summary ?? pkg.details,
    image: pkg.imagePath ? `${siteConfig.url}${pkg.imagePath}` : undefined,
    provider: { "@type": "TravelAgency", name: siteConfig.name, url: siteConfig.url },
    // Only emit a machine-readable price when a real number was entered by the
    // admin. Deriving one from the display string risks publishing a wrong price.
    ...(typeof pkg.priceAmount === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: pkg.priceAmount,
            priceCurrency: pkg.currency ?? "PHP",
            availability: "https://schema.org/InStock"
          }
        }
      : {})
  }

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
                <Link href={`/packages/${category}`} className="hover:underline">
                  {meta.title}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                {pkg.title}
              </li>
            </ol>
          </nav>

          <header className="mt-6">
            <h1 className="text-3xl font-bold text-primary md:text-5xl">{pkg.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">
                {formatPackagePrice(pkg)}
              </span>
              {duration ? (
                <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
                  {duration}
                </span>
              ) : null}
              {pkg.destination ? (
                <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium">
                  {pkg.destination}
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-2xl text-muted-foreground">{pkg.summary ?? pkg.details}</p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-10">
              {pkg.imagePath ? (
                <figure>
                  {/*
                    Rendered inline at full width (not only in a modal) so phone
                    users can pinch-zoom the poster natively.
                  */}
                  <Image
                    src={pkg.imagePath}
                    alt={pkg.imageAlt ?? `${pkg.title} package poster`}
                    width={1200}
                    height={1700}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="h-auto w-full rounded-2xl border border-border"
                    priority
                  />
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    Full package poster — pinch or zoom to read the fine print.
                  </figcaption>
                </figure>
              ) : null}

              {hasItinerary ? (
                <section aria-labelledby="itinerary-heading">
                  <h2 id="itinerary-heading" className="text-2xl font-bold text-primary">
                    Day-by-day itinerary
                  </h2>
                  <ol className="mt-5 space-y-5">
                    {pkg.itinerary?.map((day) => (
                      <li key={day.day} className="rounded-2xl border border-border p-5">
                        <h3 className="font-bold text-foreground">
                          Day {day.day} — {day.title}
                        </h3>
                        {day.description ? (
                          <p className="mt-2 text-sm text-muted-foreground">{day.description}</p>
                        ) : null}
                        {day.activities?.length ? (
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                            {day.activities.map((activity) => (
                              <li key={activity}>{activity}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {hasInclusions ? (
                <section aria-labelledby="inclusions-heading" className="grid gap-6 sm:grid-cols-2">
                  <h2 id="inclusions-heading" className="sr-only">
                    What&apos;s included and excluded
                  </h2>
                  {pkg.inclusions?.length ? (
                    <div>
                      <h3 className="font-bold text-primary">Inclusions</h3>
                      <ul className="mt-3 space-y-2 text-sm">
                        {pkg.inclusions.map((item) => (
                          <li key={item}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {pkg.exclusions?.length ? (
                    <div>
                      <h3 className="font-bold text-primary">Not included</h3>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {pkg.exclusions.map((item) => (
                          <li key={item}>✕ {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {!hasItinerary && !hasInclusions ? (
                <section className="rounded-2xl border border-dashed border-border p-6">
                  <h2 className="font-bold text-primary">Full itinerary available on request</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The complete day-by-day schedule, inclusions, and travel dates for this
                    package are in the poster above. Send us a message and we&apos;ll email you
                    the full details.
                  </p>
                </section>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-primary/15 bg-card p-6 shadow-lg">
                <h2 className="text-xl font-bold text-primary">Book this package</h2>
                <InquiryForm
                  packageId={pkg.id}
                  packageTitle={pkg.title}
                  intro="Send us your booking details and we'll confirm availability and the final price."
                />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
