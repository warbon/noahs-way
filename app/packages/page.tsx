import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PackageGallery from "@/components/PackageGallery"
import { packageCategoryMeta, type PackageCategory } from "@/lib/package-data"
import { getPackagesByCategory } from "@/lib/package-repository"
import type { PackageRecord } from "@/lib/package-repository-types"
import { parsePriceAmount } from "@/lib/price"

export const metadata: Metadata = {
  title: "All Travel Packages",
  description:
    "Browse every Noah's Way package — local Philippines trips and international itineraries, sorted by price or duration.",
  alternates: { canonical: "/packages" }
}

type SortKey = "featured" | "price-asc" | "price-desc" | "duration-asc"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "duration-asc", label: "Shortest trip" }
]

const categories: PackageCategory[] = ["local", "international"]

function priceOf(pkg: PackageRecord) {
  return pkg.priceAmount ?? parsePriceAmount(pkg.price)
}

function sortPackages(packages: PackageRecord[], sort: SortKey) {
  if (sort === "featured") return packages

  return [...packages].sort((a, b) => {
    if (sort === "duration-asc") {
      // Records with no duration sort last rather than to the top.
      return (a.durationDays ?? Infinity) - (b.durationDays ?? Infinity)
    }

    const aPrice = priceOf(a)
    const bPrice = priceOf(b)
    if (aPrice === undefined) return 1
    if (bPrice === undefined) return -1
    return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice
  })
}

type PageProps = {
  searchParams?: { q?: string; sort?: string }
}

export default async function AllPackagesPage({ searchParams }: PageProps) {
  noStore()

  const query = searchParams?.q?.trim().toLowerCase() ?? ""
  const sort = (sortOptions.find((option) => option.key === searchParams?.sort)?.key ??
    "featured") as SortKey

  const grouped = await Promise.all(
    categories.map(async (category) => ({
      category,
      packages: await getPackagesByCategory(category)
    }))
  )

  const all = grouped.flatMap((group) => group.packages)
  const filtered = query
    ? all.filter((pkg) =>
        `${pkg.title} ${pkg.details} ${pkg.destination ?? ""}`.toLowerCase().includes(query)
      )
    : all

  const results = sortPackages(filtered, sort)

  // Results are rendered without the reveal-on-scroll animation: these are
  // results the visitor explicitly asked for, so a staggered fade-in only
  // delays them and leaves blank gaps in the grid. Decorative reveals stay on
  // the marketing pages.
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Package Catalog
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">
              All Travel Packages
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Every trip we currently offer, local and international.
            </p>
          </header>

          {/* GET form: results stay linkable and work without JavaScript. */}
          <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
            <div className="flex-1 basis-64 space-y-1.5">
              <label htmlFor="q" className="text-sm font-medium">
                Search packages
              </label>
              <input
                id="q"
                name="q"
                defaultValue={searchParams?.q ?? ""}
                placeholder="Cebu, Korea, beach…"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort by
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {sortOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              Apply
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/packages/${category}`}
                className="rounded-full border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {packageCategoryMeta[category].title}
              </Link>
            ))}
          </div>

          <p className="mt-8 text-sm text-muted-foreground" role="status">
            {results.length} package{results.length === 1 ? "" : "s"}
            {query ? ` matching “${searchParams?.q}”` : ""}
          </p>

          <div className="mt-6">
            {results.length > 0 ? (
              <PackageGallery
                packages={results}
                layout="grid"
                gridClassName="md:grid-cols-2 xl:grid-cols-3"
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                No packages matched that search. Try a different destination, or{" "}
                <Link href="/#contact" className="font-semibold text-primary underline">
                  tell us what you&apos;re looking for
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
