import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { listBookingActivity } from "@/lib/activity-repository"
import { getBookingDashboardData } from "@/lib/booking-dashboard"

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim()
  const inquiryId = request.nextUrl.searchParams.get("inquiryId")?.trim()
  if (bookingId && inquiryId) {
    if (!/^[a-zA-Z0-9-]{1,120}$/.test(bookingId) || !/^[a-zA-Z0-9-]{1,120}$/.test(inquiryId)) {
      return NextResponse.json({ error: "Invalid activity query." }, { status: 400 })
    }
    return NextResponse.json(
      { activities: await listBookingActivity(bookingId, inquiryId) },
      { headers: { "Cache-Control": "no-store" } }
    )
  }
  const rawOffset = Number.parseInt(request.nextUrl.searchParams.get("activityOffset") ?? "0", 10)
  const activityOffset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0
  return NextResponse.json(await getBookingDashboardData({ activityOffset }), {
    headers: { "Cache-Control": "no-store" }
  })
}
