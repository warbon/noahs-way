import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { FacebookShareError, sharePackageToFacebook } from "@/lib/facebook/share"
import { getAllPackagesForAdmin, updatePackageRecord } from "@/lib/package-repository"

/** An image upload to Facebook can outlast the default serverless budget. */
export const maxDuration = 60

type RouteContext = {
  params: {
    id: string
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Publishes one package to the Facebook Page.
 *
 * Sharing is its own action rather than a side effect of saving, so an admin
 * fixing a typo in a published package does not announce it to the Page a second
 * time. The two things that could go wrong quietly are guarded here: a draft
 * cannot be shared at all, and a package that already carries a post id needs an
 * explicit `force` before it is posted again.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const packageId = params.id
  if (!packageId) {
    return errorResponse("Package id is required", 400)
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const force = body?.force === true

  const catalog = await getAllPackagesForAdmin()
  const pkg = [...catalog.local, ...catalog.international].find((item) => item.id === packageId)

  if (!pkg) {
    return errorResponse("Package not found", 404)
  }

  if (pkg.status === "draft") {
    return errorResponse(
      "This package is still a draft. Publish it on the website first — a post that links to a " +
        "page nobody can open is worse than no post.",
      400
    )
  }

  if (pkg.facebookPostId && !force) {
    return NextResponse.json(
      {
        error: "This package has already been posted to the Page.",
        alreadyPosted: {
          postId: pkg.facebookPostId,
          postedAt: pkg.facebookPostedAt ?? null,
          permalink: pkg.facebookPermalink ?? null
        }
      },
      { status: 409 }
    )
  }

  let share
  try {
    share = await sharePackageToFacebook(pkg)
  } catch (error) {
    if (error instanceof FacebookShareError) {
      return errorResponse(error.message, error.status)
    }
    console.error("[facebook] Sharing a package failed", error)
    return errorResponse("The package could not be shared to Facebook.", 500)
  }

  // The post is live at this point. A failure to record it locally leaves the
  // package looking unshared, which is the safe direction to fail — but it is
  // still worth reporting rather than swallowing, because the next click would
  // publish a duplicate.
  const updated = await updatePackageRecord(packageId, {
    // `post_id` is what a permalink is built from; the photo id is the fallback
    // for the rare publish that returns no feed post.
    facebookPostId: share.postId ?? share.photoId,
    facebookPostedAt: share.sharedAt,
    ...(share.permalink ? { facebookPermalink: share.permalink } : {})
  }).catch((error) => {
    console.error("[facebook] Posted to the Page but could not record it on the package", error)
    return null
  })

  revalidatePath("/admin/packages")

  return NextResponse.json({
    package: updated,
    share: {
      postId: share.postId,
      permalink: share.permalink,
      sharedAt: share.sharedAt,
      caption: share.caption,
      recorded: Boolean(updated)
    }
  })
}
