import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { notFound, redirect } from "next/navigation"

import AdminPreviewActions from "@/components/AdminPreviewActions"
import PackageDetailView from "@/components/PackageDetailView"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { resolveFacebookConfig } from "@/lib/facebook/config"
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
 * A package exactly as a customer would read it, drafts included, with the
 * decisions about it in a bar underneath.
 *
 * No site navbar, footer or floating buttons: those are the same on every
 * page and only stand between the admin and the part that is new. The body is
 * the same PackageDetailView the public page renders, so what is reviewed here
 * is what goes live.
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

  const facebook = await resolveFacebookConfig()

  return (
    // Room at the bottom so the action bar never sits over the end of the page.
    <div className="min-h-screen bg-background pb-44">
      <PackageDetailView pkg={pkg} category={pkg.category} preview />
      <AdminPreviewActions
        id={pkg.id}
        title={pkg.title}
        isDraft={isDraft}
        facebookPostId={pkg.facebookPostId}
        facebookPostedAt={pkg.facebookPostedAt}
        facebookPermalink={pkg.facebookPermalink}
        liveHref={liveSlug ? buildPackageHref(pkg.category, liveSlug) : null}
        facebookAvailable={facebook.available}
      />
    </div>
  )
}
