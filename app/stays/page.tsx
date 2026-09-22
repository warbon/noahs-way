import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import StayGrid from "@/components/StayGrid"
import { pill } from "@/lib/pill"
import { stayMeta } from "@/lib/stay-data"
import { getStays } from "@/lib/stay-repository"
import type { StayRecord } from "@/lib/stay-repository-types"

export const metadata: Metadata = {
  title: stayMeta.title,
  description: stayMeta.description,
  alternates: { canonical: "/stays" },
  openGraph: {
    title: stayMeta.title,
    description: stayMeta.description,
    url: "/stays"
  }
}

type SortKey = "featured" | "price-asc" | "price-desc" | "guests-desc"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Nightly rate: low to high" },
  { key: "price-desc", label: "Nightly rate: high to low" },
  { key: "guests-desc", label: "Sleeps the most" }
]

function sortStays(stays: StayRecord[], sort: SortKey) {
  if (sort === "featured") return stays

  return [...stays].sort((a, b) => {
    if (sort === "guests-desc") return b.maxGuests - a.maxGuests
    return sort === "price-asc" ? a.nightlyRate - b.nightlyRate : b.nightlyRate - a.nightlyRate
  })
}

type PageProps = {
  searchParams?: { q?: string; sort?: string; guests?: string }
}

export default async function StaysPage({ searchParams }: PageProps) {
  noStore()

  const query = searchParams?.q?.trim().toLowerCase() ?? ""
  const sort = (sortOptions.find((option) => option.key === searchParams?.sort)?.key ??
    "featured") as SortKey
  const guestsFilter = Number.parseInt(searchParams?.guests ?? "", 10)
  const minGuests = Number.isFinite(guestsFilter) && guestsFilter > 0 ? guestsFilter : undefined

  const all = await getStays()

  const filtered = all.filter((stay) => {
    if (minGuests && stay.maxGuests < minGuests) return false
    if (!query) return true
    return `${stay.title} ${stay.details} ${stay.city} ${stay.building ?? ""} ${stay.landmark ?? ""}`
      .toLowerCase()
      .includes(query)
  })

  const results = sortStays(filtered, sort)

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Condo Rentals
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">{stayMeta.title}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">{stayMeta.description}</p>
          </header>

          {/* GET form: results stay linkable and work without JavaScript. */}
          <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
            <div className="flex-1 basis-64 space-y-1.5">
              <label htmlFor="q" className="text-sm font-medium">
                Search stays
              </label>
              <input
                id="q"
                name="q"
                defaultValue={searchParams?.q ?? ""}
                placeholder="Cebu, studio, sea view…"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="guests" className="text-sm font-medium">
                Guests
              </label>
              <select
                id="guests"
                name="guests"
                defaultValue={minGuests ? String(minGuests) : ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Any</option>
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count}+
                  </option>
                ))}
              </select>
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

          <p className="mt-8 text-sm text-muted-foreground" role="status">
            {results.length} unit{results.length === 1 ? "" : "s"}
            {query ? ` matching “${searchParams?.q}”` : ""}
          </p>

          <div className="mt-6">
            {results.length > 0 ? (
              <StayGrid stays={results} />
            ) : (
              /*
                Two different empty states. Nothing listed at all is a new
                section waiting on its first unit; nothing *matching* is a
                search that missed. Showing the same "no results" copy for both
                would tell a first-time visitor the business has no condos when
                it has simply not published one yet.
              */
              <div className="rounded-2xl border border-dashed border-primary/20 bg-card p-10 text-center">
                <h2 className="text-xl font-bold text-primary">
                  {all.length === 0 ? "No units listed just yet" : "Nothing matched that search"}
                </h2>
                <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
                  {all.length === 0
                    ? "We're preparing our first condo listings. Tell us the city and the dates you need, and we'll let you know the moment something fits."
                    : "Try a different city or a smaller group, or tell us what you're looking for and we'll check what's free."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/#contact" className={pill("active", "px-5 py-2.5 hover:bg-primary/90")}>
                    Tell us what you need
                  </Link>
                  {all.length > 0 ? (
                    <Link href="/stays" className={pill("idle", "px-5 py-2.5")}>
                      Show all units
                    </Link>
                  ) : null}
                </div>
              </div>
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
