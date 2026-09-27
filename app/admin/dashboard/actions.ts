"use server"

import { revalidatePath } from "next/cache"

import { appendActivitySafely } from "@/lib/activity-repository"
import { acceptStayInquiry } from "@/lib/booking-acceptance"
import {
  acceptPackageInquiry,
  changeBookingStatus,
  notifyBookingAndAudit,
  recordBookingPayment,
  updateBookingQuote,
  type AcceptPackageInput,
  type PaymentInput
} from "@/lib/booking-management"
import type { BookingStatus } from "@/lib/booking-types"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

export type DashboardActionResult =
  | { ok: true }
  | { ok: false; error: string }

function revalidateDashboard() {
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/inquiries")
  revalidatePath("/admin/stays")
  revalidatePath("/stays")
}

async function authorized() {
  return isAdminAuthenticated()
}

export async function acceptPackageAction(
  input: AcceptPackageInput
): Promise<DashboardActionResult> {
  if (!(await authorized())) return { ok: false, error: "Your admin session has expired." }
  const result = await acceptPackageInquiry(input)
  if (!result.ok) return result
  revalidateDashboard()
  return { ok: true }
}

export async function acceptStayAction(inquiryId: string): Promise<DashboardActionResult> {
  if (!(await authorized())) return { ok: false, error: "Your admin session has expired." }
  const result = await acceptStayInquiry(inquiryId)
  if (!result.ok) return { ok: false, error: result.error }
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
  revalidateDashboard()
  return { ok: true }
}

export async function updateQuoteAction(
  bookingId: string,
  total: number,
  currency: string,
  note?: string
): Promise<DashboardActionResult> {
  if (!(await authorized())) return { ok: false, error: "Your admin session has expired." }
  const result = await updateBookingQuote(bookingId, total, currency, note)
  if (!result.ok) return result
  revalidateDashboard()
  return { ok: true }
}

export async function recordPaymentAction(
  input: PaymentInput
): Promise<DashboardActionResult> {
  if (!(await authorized())) return { ok: false, error: "Your admin session has expired." }
  const result = await recordBookingPayment(input)
  if (!result.ok) return result
  revalidateDashboard()
  return { ok: true }
}

export async function changeStatusAction(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<DashboardActionResult> {
  if (!(await authorized())) return { ok: false, error: "Your admin session has expired." }
  const result = await changeBookingStatus(bookingId, status, reason)
  if (!result.ok) return result
  revalidateDashboard()
  return { ok: true }
}
