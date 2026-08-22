import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import PackageGallery from "@/components/PackageGallery"
import Reveal from "@/components/Reveal"
import { getPackagesByCategory } from "@/lib/package-repository"
import { pill } from "@/lib/pill"

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
        <h2 className="mb-3 text-center text-3xl font-bold text-primary md:text-4xl">
          Popular Packages
        </h2>
      </Reveal>
      <Reveal delay={100}>
        <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
          Every trip below lists its full day-by-day itinerary, what&apos;s included, and the
          departure dates we&apos;re currently running. Open one to see the detail.
        </p>
      </Reveal>

      {/*
        A category with nothing published renders no heading at all — an empty
        row under a "Local Philippines Packages" title reads as a broken page.
      */}
      {localPhilippinesPackages.length > 0 ? (
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold uppercase tracking-[0.18em] text-primary">
              Local Philippines Packages
            </h3>
            <Link
              href="/packages/local"
              className={pill()}
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
      ) : null}

      {internationalPackages.length > 0 ? (
        <div
          className={`mx-auto max-w-6xl ${
            localPhilippinesPackages.length > 0 ? "mt-14" : ""
          }`}
        >
          <Reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-bold uppercase tracking-[0.18em] text-primary">
              International Packages
            </h3>
            <Link
              href="/packages/international"
              className={pill()}
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
      ) : null}
    </section>
  )
}
