import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"

import Footer from "@/components/Footer"
import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Navbar from "@/components/Navbar"
import PackageGallery from "@/components/PackageGallery"
import {
  PACKAGE_PAGE_SIZE,
  packageCategoryMeta,
  type PackageCategory
} from "@/lib/package-data"
import { getPackagesByCategory } from "@/lib/package-repository"
import { pill } from "@/lib/pill"

/**
 * Renders at most seven slots: first, last, the current page and its
 * neighbours, with ellipses for the gaps. Without this every page number is
 * rendered, which grows unbounded as the catalog does.
 */
function buildPageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const result: (number | "ellipsis")[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push("ellipsis")
    result.push(page)
    previous = page
  }
  return result
}

type PageProps = {
  params: {
    category: string
  }
  searchParams?: {
    page?: string | string[]
  }
}

function isPackageCategory(value: string): value is PackageCategory {
  return value === "local" || value === "international"
}

function getPageNumber(rawPage: string | string[] | undefined, totalPages: number) {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const parsed = Number.parseInt(value ?? "1", 10)

  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(parsed, Math.max(totalPages, 1))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isPackageCategory(params.category)) return { title: "Packages" }

  const meta = packageCategoryMeta[params.category]
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/packages/${params.category}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/packages/${params.category}`
    }
  }
}

export default async function CategoryPackagesPage({ params, searchParams }: PageProps) {
  noStore()

  if (!isPackageCategory(params.category)) {
    notFound()
  }

  const category = params.category
  const packages = await getPackagesByCategory(category)
  const meta = packageCategoryMeta[category]
  const totalPages = Math.ceil(packages.length / PACKAGE_PAGE_SIZE)
  const currentPage = getPageNumber(searchParams?.page, totalPages)
  const startIndex = (currentPage - 1) * PACKAGE_PAGE_SIZE
  const visiblePackages = packages.slice(startIndex, startIndex + PACKAGE_PAGE_SIZE)
  const totalPagesDisplay = Math.max(totalPages, 1)
  const hasPackages = packages.length > 0
  const showingStart = hasPackages ? startIndex + 1 : 0
  const showingEnd = hasPackages ? startIndex + visiblePackages.length : 0

  return (
    <main>
      <Navbar />

      <section className="px-5 py-12 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
                Package Catalog
              </p>
              <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">{meta.title}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">{meta.description}</p>
            </div>
            <Link
              href="/#packages"
              className={pill()}
            >
              Back to Home Packages
            </Link>
          </div>

          <div className="mb-8 flex flex-wrap gap-3">
            <Link
              href="/packages/local"
              className={pill(category === "local" ? "active" : "idle")}
            >
              Local
            </Link>
            <Link
              href="/packages/international"
              className={pill(category === "international" ? "active" : "idle")}
            >
              International
            </Link>
          </div>

          {!hasPackages ? (
            /*
              An empty category is a dead end otherwise — the counter reads
              "0-0 of 0" above a paginator with nowhere to go. Point the visitor
              at the trips that do exist, and keep the enquiry route open for the
              ones that don't.
            */
            <section className="rounded-2xl border border-dashed border-primary/20 bg-card p-8 text-center">
              <h2 className="text-xl font-bold text-primary">
                No {meta.shortLabel.toLowerCase()} packages are listed right now
              </h2>
              <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
                We build these to order. Tell us where you want to go and when, and we&apos;ll put
                together an itinerary and a quote — usually within 24 hours.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/#contact"
                  className={pill("active", "px-5 py-2.5 hover:bg-primary/90")}
                >
                  Plan a trip with us
                </Link>
                <Link
                  href={`/packages/${category === "local" ? "international" : "local"}`}
                  className={pill("idle", "px-5 py-2.5")}
                >
                  Browse {category === "local" ? "international" : "local"} packages
                </Link>
              </div>
            </section>
          ) : null}

          {hasPackages ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {showingStart}-{showingEnd} of {packages.length} packages
              </span>
              <span>
                Page {currentPage} of {totalPagesDisplay}
              </span>
            </div>
          ) : null}

          <PackageGallery
            packages={visiblePackages}
            layout="grid"
            reveal
            gridClassName="md:grid-cols-2 xl:grid-cols-2"
          />

          <nav
            aria-label={`${meta.shortLabel} package pagination`}
            className={`mt-10 flex-wrap items-center justify-center gap-2 ${
              totalPages > 1 ? "flex" : "hidden"
            }`}
          >
            {currentPage === 1 ? (
              <span
                aria-disabled="true"
                className={pill("disabled")}
              >
                Previous
              </span>
            ) : (
              <Link
                href={`/packages/${category}?page=${currentPage - 1}`}
                rel="prev"
                className={pill()}
              >
                Previous
              </Link>
            )}

            {buildPageWindow(currentPage, totalPagesDisplay).map((page, index) => {
              if (page === "ellipsis") {
                return (
                  <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-primary/50">
                    …
                  </span>
                )
              }

              const isActive = page === currentPage

              return (
                <Link
                  key={page}
                  href={`/packages/${category}?page=${page}`}
                  aria-current={isActive ? "page" : undefined}
                  className={pill(isActive ? "active" : "idle", "min-w-10 justify-center")}
                >
                  {page}
                </Link>
              )
            })}

            {currentPage === totalPagesDisplay ? (
              <span
                aria-disabled="true"
                className={pill("disabled")}
              >
                Next
              </span>
            ) : (
              <Link
                href={`/packages/${category}?page=${currentPage + 1}`}
                rel="next"
                className={pill()}
              >
                Next
              </Link>
            )}
          </nav>
        </div>
      </section>

      <Footer />
      <ContactFab />
      <BackToTop />
    </main>
  )
}
