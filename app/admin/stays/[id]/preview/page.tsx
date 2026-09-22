import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { notFound, redirect } from "next/navigation"

import AdminStayPreviewActions from "@/components/AdminStayPreviewActions"
import StayDetailView from "@/components/StayDetailView"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { normalizeBlocks, todayInManila } from "@/lib/stay-availability"
import { getStayById, getStays } from "@/lib/stay-repository"
import { resolveStaySlugs } from "@/lib/stay-slug"

type PageProps = {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stay = await getStayById(params.id)

  return {
    title: stay ? `Preview: ${stay.title}` : "Unit not found",
    // An admin page, and for drafts the only place this content exists.
    robots: { index: false, follow: false }
  }
}

/**
 * A condo unit exactly as a guest would read it, drafts included, with the
 * decisions about it in a bar underneath.
 *
 * No site navbar, footer or floating buttons: those are the same on every page
 * and only stand between the admin and the part that is new. The body is the
 * same StayDetailView the public page renders — including the live calendar
 * and the price breakdown — so what is reviewed here is what goes live. The
 * booking form is inert, so checking a draft never files a real request.
 */
export default async function AdminStayPreviewPage({ params }: PageProps) {
  noStore()

  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login")
  }

  const stay = await getStayById(params.id)
  if (!stay) notFound()

  const isDraft = stay.status === "draft"

  /*
    The live URL only exists once the unit is published, and its slug has to be
    resolved against the published list the public page uses — two units with
    the same title get -2, -3 in that list's order, so deriving it from this
    record alone could point at the wrong page.
  */
  const liveSlug = isDraft
    ? null
    : resolveStaySlugs(await getStays()).find((record) => record.id === stay.id)?.slug ?? null

  // Expired ranges are not what the bar is asking about: a unit blocked solid
  // last March is wide open today.
  const today = todayInManila()
  const upcomingBlocks = normalizeBlocks(stay.blocks).filter((block) => block.to > today).length

  return (
    // Room at the bottom so the action bar never sits over the end of the page.
    <div className="min-h-screen bg-background pb-44">
      <StayDetailView stay={stay} preview />
      <AdminStayPreviewActions
        id={stay.id}
        title={stay.title}
        isDraft={isDraft}
        liveHref={liveSlug ? `/stays/${liveSlug}` : null}
        upcomingBlocks={upcomingBlocks}
      />
    </div>
  )
}
