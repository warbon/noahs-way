"use server"

import { revalidatePath } from "next/cache"

import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { updatePackageRecord } from "@/lib/package-repository"
import type { PackageRecord } from "@/lib/package-repository-types"

export type PackageStatusResult =
  | { ok: true; package: PackageRecord }
  | { ok: false; error: string }

/**
 * Publishes or unpublishes one package, and changes nothing else about it.
 *
 * The package PUT route cannot do this: its JSON body only carries the four
 * basic fields, and its form body requires every one of them. A preview that
 * only wants to flip a draft live should not have to resubmit the whole
 * package to do it.
 */
export async function setPackageStatus(
  id: string,
  status: "draft" | "published"
): Promise<PackageStatusResult> {
  // Server actions are public endpoints; the page that renders the button is
  // not what protects them.
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Your admin session has expired. Sign in again, then retry." }
  }

  if (typeof id !== "string" || !id || (status !== "draft" && status !== "published")) {
    return { ok: false, error: "That request was not understood." }
  }

  let updated: PackageRecord | null
  try {
    updated = await updatePackageRecord(id, { status })
  } catch (error) {
    console.error("[preview] Could not change package status", error)
    return { ok: false, error: "The package could not be saved. Try again in a moment." }
  }

  if (!updated) {
    return { ok: false, error: "This package no longer exists." }
  }

  // The same pages the package routes refresh, so the site agrees with the
  // admin the moment the status changes.
  revalidatePath("/")
  revalidatePath("/packages")
  revalidatePath(`/packages/${updated.category}`)
  revalidatePath(`/packages/${updated.category}/${updated.slug ?? ""}`)
  revalidatePath("/sitemap.xml")
  revalidatePath("/admin/packages")
  revalidatePath(`/admin/packages/${id}/preview`)

  return { ok: true, package: updated }
}
