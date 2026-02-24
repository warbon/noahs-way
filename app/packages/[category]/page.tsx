import Link from "next/link"
import { notFound } from "next/navigation"

import Footer from "@/components/Footer"
import MessengerChat from "@/components/MessengerChat"
import Navbar from "@/components/Navbar"
import PackageGallery from "@/components/PackageGallery"
import {
  PACKAGE_PAGE_SIZE,
  packageCatalog,
  packageCategoryMeta,
  type PackageCategory
} from "@/lib/package-data"

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

export default function CategoryPackagesPage({ params, searchParams }: PageProps) {
  if (!isPackageCategory(params.category)) {
    notFound()
  }

  const category = params.category
  const packages = packageCatalog[category]
  const meta = packageCategoryMeta[category]
  const totalPages = Math.ceil(packages.length / PACKAGE_PAGE_SIZE)
  const currentPage = getPageNumber(searchParams?.page, totalPages)
  const startIndex = (currentPage - 1) * PACKAGE_PAGE_SIZE
  const visiblePackages = packages.slice(startIndex, startIndex + PACKAGE_PAGE_SIZE)

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
              Showing {startIndex + 1}-{startIndex + visiblePackages.length} of {packages.length}{" "}
              packages
            </span>
            <span>
              Page {currentPage} of {totalPages}
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
            <Link
              href={`/packages/${category}?page=${Math.max(currentPage - 1, 1)}`}
              aria-disabled={currentPage === 1}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentPage === 1
                  ? "cursor-not-allowed border border-primary/10 bg-white/70 text-primary/40"
                  : "border border-primary/15 bg-white text-primary hover:bg-primary hover:text-white"
              }`}
            >
              Previous
            </Link>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
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

            <Link
              href={`/packages/${category}?page=${Math.min(currentPage + 1, totalPages)}`}
              aria-disabled={currentPage === totalPages}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentPage === totalPages
                  ? "cursor-not-allowed border border-primary/10 bg-white/70 text-primary/40"
                  : "border border-primary/15 bg-white text-primary hover:bg-primary hover:text-white"
              }`}
            >
              Next
            </Link>
          </nav>
        </div>
      </section>

      <Footer />
      <MessengerChat />
    </main>
  )
}
