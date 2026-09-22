import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { isDateString } from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"
import { getStayById, setStayAvailability } from "@/lib/stay-repository"
import { deriveSlug } from "@/lib/slug"

const MAX_BLOCKS = 500
const MAX_NOTE_LENGTH = 120

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Availability has its own endpoint rather than riding along on PATCH.
 *
 * Blocking dates happens far more often than editing a listing, usually from a
 * different screen and often while a guest is on the phone. Routing it through
 * the listing payload would mean every calendar change carried — and could
 * clobber — the whole record.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  const stay = await getStayById(params.id)
  if (!stay) {
    return errorResponse("Stay not found", 404)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  const rawBlocks = (payload as { blocks?: unknown })?.blocks
  if (!Array.isArray(rawBlocks)) {
    return errorResponse("Expected a list of blocked date ranges", 400)
  }

  if (rawBlocks.length > MAX_BLOCKS) {
    return errorResponse(`A unit cannot hold more than ${MAX_BLOCKS} blocked ranges`, 400)
  }

  const blocks: AvailabilityBlock[] = []
  for (const raw of rawBlocks) {
    if (!raw || typeof raw !== "object") {
      return errorResponse("Each blocked range needs a from and a to date", 400)
    }

    const { from, to, note } = raw as Record<string, unknown>

    if (!isDateString(from) || !isDateString(to)) {
      return errorResponse("Blocked dates must be real calendar dates (YYYY-MM-DD)", 400)
    }

    if (to <= from) {
      return errorResponse(`"${from}" to "${to}" is not a range — the end must be later`, 400)
    }

    blocks.push({
      from,
      to,
      ...(typeof note === "string" && note.trim()
        ? { note: note.trim().slice(0, MAX_NOTE_LENGTH) }
        : {})
    })
  }

  // The repository normalizes: sorts, merges overlaps, and stamps the update
  // time that the public calendar shows.
  const updated = await setStayAvailability(params.id, blocks)
  if (!updated) {
    return errorResponse("Stay not found", 404)
  }

  const slug = deriveSlug(updated, "stay")
  revalidatePath("/stays")
  revalidatePath(`/stays/${slug}`)
  revalidatePath("/admin/stays")

  return NextResponse.json({ stay: updated })
}
