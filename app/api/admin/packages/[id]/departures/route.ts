import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { normalizeDepartures } from "@/lib/package-departures"
import { getAllPackagesForAdmin, updatePackageRecord } from "@/lib/package-repository"
import { buildPackageHref, derivePackageSlug } from "@/lib/package-slug"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Marks one departure sold out, or open again.
 *
 * Its own endpoint rather than a field on the package PUT, the same call the
 * condo calendar made: this is flipped far more often than the package is
 * edited, usually while the operator is on the phone, and sending the whole
 * package to change one flag would let a stale panel overwrite everything else.
 * Only the named departure changes, against the record as stored right now.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  const { departureId, soldOut } = (payload ?? {}) as Record<string, unknown>
  if (typeof departureId !== "string" || !departureId || typeof soldOut !== "boolean") {
    return errorResponse("Expected a departureId and a soldOut true or false", 400)
  }

  const catalog = await getAllPackagesForAdmin()
  const pkg = [...catalog.local, ...catalog.international].find((item) => item.id === params.id)
  if (!pkg) {
    return errorResponse("Package not found", 404)
  }

  const departures = normalizeDepartures(pkg.departures)
  const target = departures.find((departure) => departure.id === departureId)
  if (!target) {
    return errorResponse("That travel period is no longer on this package. Refresh and try again.", 404)
  }

  const next = departures.map((departure) => {
    if (departure.id !== departureId) return departure
    const changed = { ...departure }
    // Absent rather than false, the same shape normalizeDepartures writes.
    if (soldOut) changed.soldOut = true
    else delete changed.soldOut
    return changed
  })

  const updated = await updatePackageRecord(pkg.id, { departures: next })
  if (!updated) {
    return errorResponse("Package not found", 404)
  }

  revalidatePath("/")
  revalidatePath(`/packages/${updated.category}`)
  revalidatePath(buildPackageHref(updated.category, derivePackageSlug(updated)))
  revalidatePath("/admin/packages")

  return NextResponse.json({ departures: updated.departures ?? [] })
}
