import { ArrowLeft, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { notFound, redirect } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PackageDetailView from "@/components/PackageDetailView"
import ScrollProgress from "@/components/ScrollProgress"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { getAllPackagesForAdmin, getPackagesByCategory } from "@/lib/package-repository"
import { buildPackageHref, resolveSlugCollisions } from "@/lib/package-slug"

type PageProps = {
  params: { id: string }
}

async function findPackage(id: string) {
  const catalog = await getAllPackagesForAdmin()
  return [...catalog.local, ...catalog.international].find((pkg) => pkg.id === id) ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pkg = await findPackage(params.id)

  return {
    title: pkg ? `Preview: ${pkg.title}` : "Package not found",
    // An admin page, and for drafts the only place this content exists.
    robots: { index: false, follow: false }
  }
}

/**
 * A package exactly as a customer would see it, drafts included.
 *
 * The public page refuses drafts on purpose, which left no way to look at one
 * before publishing it — the admin could only read the form. This renders the
 * same PackageDetailView under the site's own navbar and footer, with a bar on
 * top that says which state the package is in.
 */
export default async function AdminPackagePreviewPage({ params }: PageProps) {
  noStore()

  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login")
  }

  const pkg = await findPackage(params.id)
  if (!pkg) notFound()

  const isDraft = pkg.status === "draft"

  // The live URL only exists once the package is published, and its slug has
  // to be resolved against the published list the public page uses — two
  // packages with the same title get -2, -3 in that list's order.
  const liveSlug = isDraft
    ? null
    : resolveSlugCollisions(await getPackagesByCategory(pkg.category)).find(
        (record) => record.id === pkg.id
      )?.slug ?? null

  return (
    <>
      <div
        className={
          isDraft
            ? "border-b border-amber-300 bg-amber-100 text-amber-950"
            : "border-b border-emerald-300 bg-emerald-100 text-emerald-950"
        }
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm md:px-8">
          <p>
            <span className="font-bold">{isDraft ? "Draft preview" : "Published"}</span>
            {" — "}
            {isDraft
              ? "customers can't see this yet. This is how the page will look once it is published."
              : "this is the page customers see."}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {liveSlug ? (
              <a
                href={buildPackageHref(pkg.category, liveSlug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Open live page
              </a>
            ) : null}
            <Link
              href="/admin/packages"
              className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Package Manager
            </Link>
          </div>
        </div>
      </div>

      <ScrollProgress />
      <Navbar />
      <PackageDetailView pkg={pkg} category={pkg.category} preview />
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
