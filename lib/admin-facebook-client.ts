import type { AdminPackageRecord } from "@/lib/admin-package-types"

/** What the admin should be told after a post attempt, and where it can link. */
export type PostOutcome = { message: string; href: string | null }

function readError(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

/**
 * Posts one saved package to the Facebook Page and turns every ending into a
 * sentence the admin can act on.
 *
 * Deliberately never throws: callers have usually just committed a save or a
 * publish they must not pretend did not happen. Shared by the Package Manager
 * and the preview page so the two cannot word the same outcome differently.
 */
export async function postPackageToFacebook(
  pkg: Pick<AdminPackageRecord, "id" | "title" | "facebookPostId">,
  prefix = ""
): Promise<PostOutcome> {
  try {
    const response = await fetch(`/api/admin/packages/${pkg.id}/facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The API refuses a second post unless it is asked twice on purpose, and
      // the confirm step the admin just passed through is that purpose.
      body: JSON.stringify({ force: Boolean(pkg.facebookPostId) })
    })
    const payload = (await response.json().catch(() => null)) as {
      alreadyPosted?: { permalink: string | null }
      share?: { permalink: string | null; recorded: boolean }
    } | null

    if (response.status === 409) {
      return {
        message: `${prefix}It was already posted to the Page, so nothing was posted again — use Repost if you meant to.`,
        href: payload?.alreadyPosted?.permalink ?? null
      }
    }

    if (!response.ok) {
      return {
        message: `${prefix}${readError(payload) ?? "Could not post to Facebook."}`,
        href: null
      }
    }

    return {
      // A post that went out but was not recorded is the one case worth
      // spelling out, because the next click would quietly publish a duplicate.
      message:
        payload?.share?.recorded === false
          ? `${prefix}Posted “${pkg.title}” to Facebook, but it could not be marked as posted here — check the Page before posting it again.`
          : `${prefix}Posted “${pkg.title}” to Facebook.`,
      href: payload?.share?.permalink ?? null
    }
  } catch {
    // The request may well have landed, so this must not claim it did not.
    return {
      message: `${prefix}The network dropped before Facebook answered — check the Page before posting it again.`,
      href: null
    }
  }
}
