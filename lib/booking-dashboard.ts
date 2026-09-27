import { listActivity } from "@/lib/activity-repository"
import type { ActivityEvent } from "@/lib/activity-types"
import { listBookings } from "@/lib/booking-repository"
import {
  bookingPaymentTotals,
  getBookingEndDate,
  getBookingPayments,
  getBookingProductType
} from "@/lib/booking-types"
import type { BookingDashboardData, CurrencyMetric } from "@/lib/dashboard-types"
import { listInquiries } from "@/lib/inquiry-repository"
import { todayInManila } from "@/lib/stay-availability"

const ACTIVITY_PAGE_SIZE = 25

function totalsByCurrency(entries: Array<{ currency: string; amount: number }>): CurrencyMetric[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amount)
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount })).sort((a, b) =>
    a.currency.localeCompare(b.currency)
  )
}

function syntheticActivity(
  inquiries: Awaited<ReturnType<typeof listInquiries>>,
  bookings: Awaited<ReturnType<typeof listBookings>>
): ActivityEvent[] {
  return [
    ...inquiries.map<ActivityEvent>((inquiry) => ({
      id: `synthetic-inquiry-${inquiry.id}`,
      entityType: "inquiry",
      entityId: inquiry.id,
      inquiryId: inquiry.id,
      bookingId: inquiry.bookingId,
      productType: inquiry.stayId ? "stay" : inquiry.packageId ? "package" : undefined,
      customerName: inquiry.name,
      kind: "inquiry.received",
      summary: "Inquiry received",
      actor: "system",
      occurredAt: inquiry.createdAt
    })),
    ...bookings.map<ActivityEvent>((booking) => ({
      id: `synthetic-booking-${booking.id}`,
      entityType: "booking",
      entityId: booking.id,
      inquiryId: booking.inquiryId,
      bookingId: booking.id,
      productType: getBookingProductType(booking),
      customerName: booking.guestName,
      kind: "booking.created",
      summary: "Booking accepted",
      actor: "admin",
      occurredAt: booking.createdAt,
      metadata: { total: booking.total, currency: booking.currency }
    }))
  ]
}

export async function getBookingDashboardData(
  options: { activityOffset?: number } = {}
): Promise<BookingDashboardData> {
  const activityOffset = Math.max(options.activityOffset ?? 0, 0)
  const [inquiries, bookings, storedActivity] = await Promise.all([
    listInquiries(),
    listBookings(),
    listActivity({ offset: activityOffset, limit: ACTIVITY_PAGE_SIZE + 1 })
  ])

  const today = todayInManila()
  const month = today.slice(0, 7)
  const now = new Date().toISOString()
  const active = bookings.filter((booking) => booking.status !== "cancelled")
  const outstandingBalances = totalsByCurrency(
    active.flatMap((booking) => {
      const balance = bookingPaymentTotals(booking).balance
      return balance > 0 ? [{ currency: booking.currency, amount: balance }] : []
    })
  )
  const collectedThisMonth = totalsByCurrency(
    bookings.flatMap((booking) =>
      getBookingPayments(booking)
        .filter((entry) => entry.occurredAt.startsWith(month))
        .map((entry) => ({
          currency: entry.currency,
          amount: entry.kind === "payment" ? entry.amount : -entry.amount
        }))
    )
  )

  const hasMoreActivity = storedActivity.length > ACTIVITY_PAGE_SIZE
  let activities = storedActivity.slice(0, ACTIVITY_PAGE_SIZE)
  if (activityOffset === 0) {
    const ids = new Set(activities.map((event) => `${event.kind}:${event.entityId}`))
    activities = [...activities, ...syntheticActivity(inquiries, bookings).filter((event) => !ids.has(`${event.kind}:${event.entityId}`))]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, ACTIVITY_PAGE_SIZE)
  }

  return {
    generatedAt: now,
    inquiries,
    bookings,
    activities,
    nextActivityOffset: hasMoreActivity ? activityOffset + ACTIVITY_PAGE_SIZE : null,
    summary: {
      newInquiries: inquiries.filter((inquiry) => inquiry.status === "new").length,
      heldBookings: bookings.filter((booking) => booking.status === "held").length,
      overdueHolds: bookings.filter(
        (booking) => booking.status === "held" && booking.holdExpiresAt && booking.holdExpiresAt < now
      ).length,
      upcomingConfirmed: bookings.filter(
        (booking) => booking.status === "confirmed" && getBookingEndDate(booking) >= today
      ).length,
      outstandingBalances,
      collectedThisMonth
    }
  }
}
