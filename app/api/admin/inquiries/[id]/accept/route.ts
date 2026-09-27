import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { acceptStayInquiry } from "@/lib/booking-acceptance"
import { appendActivitySafely } from "@/lib/activity-repository"
import { notifyBookingAndAudit } from "@/lib/booking-management"

type RouteContext = { params: { id: string } }

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await acceptStayInquiry(params.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
  }

  if (result.created) {
    await appendActivitySafely({
      id: `act-booking-created-${result.booking.id}`,
      entityType: "booking",
      entityId: result.booking.id,
      inquiryId: result.inquiry.id,
      bookingId: result.booking.id,
      productType: "stay",
      customerName: result.booking.guestName,
      kind: "booking.created",
      summary: "Condo booking accepted and dates held",
      actor: "admin",
      occurredAt: result.booking.createdAt,
      metadata: { total: result.booking.total, currency: result.booking.currency }
    })
    await notifyBookingAndAudit(
      result.booking,
      `Your dates are being held — ${result.booking.stayTitle}`,
      [
        "We accepted your request and are holding your dates while we arrange the deposit.",
        "No payment has been taken yet. Your booking is confirmed after we acknowledge the required deposit."
      ]
    )
  }

  revalidatePath("/admin/inquiries")
  revalidatePath("/admin/stays")
  revalidatePath("/stays")
  revalidatePath(`/stays/${result.booking.staySlug}`)

  return NextResponse.json(
    { booking: result.booking, inquiry: result.inquiry, created: result.created },
    { status: result.created ? 201 : 200 }
  )
}
