import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import PackageGallery from "@/components/PackageGallery"
import Reveal from "@/components/Reveal"
import { getPackagesByCategory } from "@/lib/package-repository"

export default async function Packages() {
  noStore()

  const [localPhilippinesPackages, internationalPackages] = await Promise.all([
    getPackagesByCategory("local"),
    getPackagesByCategory("international")
  ])

  return (
    <section
      id="packages"
      className="bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-5 py-24 md:px-8"
    >
      <Reveal>
        <h3 className="mb-3 text-center text-3xl font-bold text-primary md:text-4xl">
          Popular Packages
        </h3>
      </Reveal>
      <Reveal delay={100}>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          Browse featured packages in a carousel. Click any card to preview its package image, or
          open the full package list by category.
        </p>
      </Reveal>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xl font-bold uppercase tracking-[0.18em] text-primary">
            Local Philippines Packages
          </h4>
          <Link
            href="/packages/local"
            className="inline-flex items-center rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
          >
            View All Local Packages
          </Link>
        </Reveal>
        <PackageGallery
          packages={localPhilippinesPackages}
          layout="carousel"
          autoScrollDirection="left"
          reveal
          carouselItemClassName="min-w-[85%] sm:min-w-[47%] lg:min-w-[32%]"
        />
      </div>

      <div className="mx-auto mt-14 max-w-6xl">
        <Reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xl font-bold uppercase tracking-[0.18em] text-primary">
            International Packages
          </h4>
          <Link
            href="/packages/international"
            className="inline-flex items-center rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
          >
            View All International Packages
          </Link>
        </Reveal>
        <PackageGallery
          packages={internationalPackages}
          layout="carousel"
          autoScrollDirection="right"
          reveal
          carouselItemClassName="min-w-[85%] sm:min-w-[47%] lg:min-w-[24%]"
        />
      </div>
    </section>
  )
}
