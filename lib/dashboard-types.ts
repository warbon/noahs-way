import type { ActivityEvent } from "@/lib/activity-types"
import type { BookingRecord } from "@/lib/booking-types"
import type { InquiryRecord } from "@/lib/inquiry-types"

export type CurrencyMetric = { currency: string; amount: number }

export type BookingDashboardData = {
  generatedAt: string
  inquiries: InquiryRecord[]
  bookings: BookingRecord[]
  activities: ActivityEvent[]
  nextActivityOffset: number | null
  summary: {
    newInquiries: number
    heldBookings: number
    overdueHolds: number
    upcomingConfirmed: number
    outstandingBalances: CurrencyMetric[]
    collectedThisMonth: CurrencyMetric[]
  }
}
