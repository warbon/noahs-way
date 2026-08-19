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

      <section className="px-5 py-24 md:px-8">
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
              className="inline-flex items-center rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
            >
              Back to Home Packages
            </Link>
          </div>

          <div className="mb-8 flex flex-wrap gap-3">
            <Link
              href="/packages/local"
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === "local"
                  ? "bg-primary text-white"
                  : "border border-primary/15 bg-white text-primary hover:bg-primary hover:text-white"
              }`}
            >
              Local
            </Link>
            <Link
              href="/packages/international"
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === "international"
                  ? "bg-primary text-white"
                  : "border border-primary/15 bg-white text-primary hover:bg-primary hover:text-white"
              }`}
            >
              International
            </Link>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Showing {showingStart}-{showingEnd} of {packages.length} packages
            </span>
            <span>
              Page {currentPage} of {totalPagesDisplay}
            </span>
          </div>

          <PackageGallery
            packages={visiblePackages}
            layout="grid"
            reveal
            gridClassName="md:grid-cols-2 xl:grid-cols-2"
          />

          <nav
            aria-label={`${meta.shortLabel} package pagination`}
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {currentPage === 1 ? (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-full border border-primary/10 bg-white/70 px-4 py-2 text-sm font-semibold text-primary/40"
              >
                Previous
              </span>
            ) : (
              <Link
                href={`/packages/${category}?page=${currentPage - 1}`}
                rel="prev"
                className="rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
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
                  className={`min-w-10 rounded-full px-4 py-2 text-center text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "border border-primary/15 bg-white text-primary hover:bg-primary hover:text-white"
                  }`}
                >
                  {page}
                </Link>
              )
            })}

            {currentPage === totalPagesDisplay ? (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-full border border-primary/10 bg-white/70 px-4 py-2 text-sm font-semibold text-primary/40"
              >
                Next
              </span>
            ) : (
              <Link
                href={`/packages/${category}?page=${currentPage + 1}`}
                rel="next"
                className="rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
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
