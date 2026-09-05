import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { resolveFacebookConfig } from "@/lib/facebook/config"
import { FacebookApiError, fetchPageProfile } from "@/lib/facebook/graph"
import { updateFacebookSettings } from "@/lib/facebook/settings-repository"

export const maxDuration = 30

/**
 * Asks Facebook who the saved token speaks for.
 *
 * A Page token is opaque — it looks the same whether it is valid, expired, or a
 * user token pasted by mistake — and the alternative way to find out is a failed
 * post on a live business Page. This is the safe way to find out first, so it is
 * deliberately a read: it proves the credentials without publishing anything.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await resolveFacebookConfig()

  if (config.storedTokenUnreadable) {
    return NextResponse.json({
      ok: false,
      error:
        "The saved token can no longer be decrypted — ADMIN_SESSION_SECRET has changed since it " +
        "was saved. Enter the Page access token again."
    })
  }

  if (!config.pageId) {
    return NextResponse.json({ ok: false, error: "No Page id is configured." })
  }

  if (!config.accessToken) {
    return NextResponse.json({ ok: false, error: "No Page access token is configured." })
  }

  try {
    // Deliberately ignores `enabled`: an admin needs to be able to verify the
    // connection before switching sharing on.
    const page = await fetchPageProfile({
      pageId: config.pageId,
      accessToken: config.accessToken
    })

    // Cached so the panel can name the Page instead of showing a bare id. A
    // failure here is cosmetic and must not turn a passing test into a failure.
    await updateFacebookSettings({ pageName: page.name }).catch((error) => {
      console.error("[facebook] Could not cache the Page name", error)
    })

    return NextResponse.json({ ok: true, page })
  } catch (error) {
    const message =
      error instanceof FacebookApiError ? error.message : "The Facebook request failed"

    console.error("[facebook] Connection test failed", error)
    return NextResponse.json({ ok: false, error: message })
  }
}
