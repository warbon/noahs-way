import {
  getBookingEndDate,
  getBookingProductType,
  getBookingStartDate,
  getBookingTitle,
  type BookingRecord
} from "@/lib/booking-types"
import { formatStayDate } from "@/lib/stay-availability"
import { siteConfig } from "@/lib/site-config"

const NOTIFICATION_TIMEOUT_MS = 8_000

export type BookingNotificationResult = "sent" | "not-configured" | "failed"

function money(booking: BookingRecord) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: booking.currency,
    maximumFractionDigits: 0
  }).format(booking.total)
}

function baseDetails(booking: BookingRecord) {
  const productType = getBookingProductType(booking)
  return [
    `${productType === "stay" ? "Stay" : "Package"}: ${getBookingTitle(booking)}`,
    `Dates: ${formatStayDate(getBookingStartDate(booking))} to ${formatStayDate(getBookingEndDate(booking))}`,
    `Total: ${money(booking)}`,
    `Reference: ${booking.id}`
  ]
}

async function sendEmail(booking: BookingRecord, subject: string, message: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.INQUIRY_EMAIL_FROM!.trim(),
      to: booking.guestEmail,
      subject,
      text: message,
      reply_to: process.env.INQUIRY_EMAIL_TO?.trim() || siteConfig.email
    })
  })
  if (!response.ok) throw new Error(`Resend responded ${response.status}: ${await response.text()}`)
}

async function sendWebhook(booking: BookingRecord, subject: string, message: string) {
  const response = await fetch(process.env.INQUIRY_NOTIFY_WEBHOOK_URL!.trim(), {
    method: "POST",
    signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `${subject}\n${message}\nInbox: ${siteConfig.url}/admin/dashboard`,
      bookingId: booking.id
    })
  })
  if (!response.ok) throw new Error(`Webhook responded ${response.status}`)
}

export async function notifyBookingUpdate(
  booking: BookingRecord,
  subject: string,
  lines: string[]
): Promise<BookingNotificationResult> {
  const message = [
    `Hi ${booking.guestName.split(" ")[0] || booking.guestName},`,
    "",
    ...lines,
    "",
    ...baseDetails(booking),
    "",
    siteConfig.name,
    siteConfig.phone,
    siteConfig.url
  ].join("\n")

  const tasks: Promise<void>[] = []
  if (process.env.RESEND_API_KEY?.trim() && process.env.INQUIRY_EMAIL_FROM?.trim()) {
    tasks.push(sendEmail(booking, subject, message))
  }
  if (process.env.INQUIRY_NOTIFY_WEBHOOK_URL?.trim()) {
    tasks.push(sendWebhook(booking, subject, message))
  }
  if (!tasks.length) return "not-configured"

  const results = await Promise.allSettled(tasks)
  const failure = results.find((result) => result.status === "rejected")
  if (failure?.status === "rejected") {
    console.error(`[booking] notification for ${booking.id} failed`, failure.reason)
    return "failed"
  }
  return "sent"
}

export function notifyBookingAccepted(booking: BookingRecord) {
  return notifyBookingUpdate(booking, `Your dates are being held — ${getBookingTitle(booking)}`, [
    "We accepted your request and are holding your dates while we arrange the deposit.",
    "No payment has been taken yet. Your booking is confirmed after we acknowledge the required deposit."
  ])
}
