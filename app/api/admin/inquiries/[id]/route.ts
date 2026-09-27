import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { deleteInquiry, getInquiryById, updateInquiry } from "@/lib/inquiry-repository"
import {
  InquiryHasBookingError,
  isInquiryStatus,
  type UpdateInquiryPayload
} from "@/lib/inquiry-types"

type RouteContext = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const updates: UpdateInquiryPayload = {}

  if ("status" in payload) {
    if (!isInquiryStatus(payload.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    if (payload.status === "accepted") {
      return NextResponse.json(
        { error: "Use the accept action so the dates and booking are stored together" },
        { status: 400 }
      )
    }
    updates.status = payload.status
  }

  if ("adminNote" in payload) {
    if (typeof payload.adminNote !== "string") {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 })
    }
    updates.adminNote = payload.adminNote.slice(0, 2000)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  if (updates.status && updates.status !== "archived") {
    const existing = await getInquiryById(params.id)
    if (existing?.bookingId) {
      return NextResponse.json(
        { error: "This inquiry owns a held booking. Manage the booking before changing its status." },
        { status: 409 }
      )
    }
  }

  let updated: Awaited<ReturnType<typeof updateInquiry>>
  try {
    updated = await updateInquiry(params.id, updates)
  } catch (error) {
    if (error instanceof InquiryHasBookingError) {
      return NextResponse.json(
        { error: "This inquiry owns a held booking. Manage the booking before changing its status." },
        { status: 409 }
      )
    }
    throw error
  }
  if (!updated) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
  }

  revalidatePath("/admin/inquiries")
  return NextResponse.json({ inquiry: updated })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await getInquiryById(params.id)
  if (existing?.bookingId) {
    return NextResponse.json(
      { error: "Accepted booking inquiries must be archived, not deleted" },
      { status: 409 }
    )
  }

  let deleted: Awaited<ReturnType<typeof deleteInquiry>>
  try {
    deleted = await deleteInquiry(params.id)
  } catch (error) {
    if (error instanceof InquiryHasBookingError) {
      return NextResponse.json(
        { error: "Accepted booking inquiries must be archived, not deleted" },
        { status: 409 }
      )
    }
    throw error
  }
  if (!deleted) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
  }

  revalidatePath("/admin/inquiries")
  return NextResponse.json({ inquiry: deleted })
}
