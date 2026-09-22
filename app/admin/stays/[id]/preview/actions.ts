"use server"

import { revalidatePath } from "next/cache"

import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { deriveSlug } from "@/lib/slug"
import { updateStay } from "@/lib/stay-repository"
import type { StayRecord } from "@/lib/stay-repository-types"

export type StayStatusResult =
  | { ok: true; stay: StayRecord }
  | { ok: false; error: string }

/**
 * Publishes or unpublishes one unit, and changes nothing else about it.
 *
 * The PATCH route could do this, but only by resubmitting the form: its photo
 * and gallery handling both key off fields the preview page never renders, so
 * flipping a draft live from here would mean rebuilding a FormData that
 * describes the whole listing just to change one word.
 */
export async function setStayStatus(
  id: string,
  status: "draft" | "published"
): Promise<StayStatusResult> {
  // Server actions are public endpoints; the page that renders the button is
  // not what protects them.
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Your admin session has expired. Sign in again, then retry." }
  }

  if (typeof id !== "string" || !id || (status !== "draft" && status !== "published")) {
    return { ok: false, error: "That request was not understood." }
  }

  let updated: StayRecord | null
  try {
    updated = await updateStay(id, { status })
  } catch (error) {
    console.error("[preview] Could not change stay status", error)
    return { ok: false, error: "The unit could not be saved. Try again in a moment." }
  }

  if (!updated) {
    return { ok: false, error: "This unit no longer exists." }
  }

  // The same paths the stay routes refresh, so the site agrees with the admin
  // the moment the status changes.
  revalidatePath("/")
  revalidatePath("/stays")
  revalidatePath(`/stays/${deriveSlug(updated, "stay")}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/stays")
  revalidatePath(`/admin/stays/${id}/preview`)

  return { ok: true, stay: updated }
}
