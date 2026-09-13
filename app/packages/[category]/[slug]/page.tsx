import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PackageDetailView from "@/components/PackageDetailView"
import ScrollProgress from "@/components/ScrollProgress"
import type { PackageCategory } from "@/lib/package-data"
import { getPackagesByCategory } from "@/lib/package-repository"
import type { PackageRecord } from "@/lib/package-repository-types"
import { buildPackageHref, findPackageBySlug } from "@/lib/package-slug"
import { formatDuration } from "@/lib/price"
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

      <PackageDetailView pkg={pkg} category={category} />

      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
