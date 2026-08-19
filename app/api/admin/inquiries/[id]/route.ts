import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { deleteInquiry, updateInquiry } from "@/lib/inquiry-repository"
import { isInquiryStatus, type UpdateInquiryPayload } from "@/lib/inquiry-types"

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

  const updated = await updateInquiry(params.id, updates)
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

  const deleted = await deleteInquiry(params.id)
  if (!deleted) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 })
  }

  revalidatePath("/admin/inquiries")
  return NextResponse.json({ inquiry: deleted })
}
