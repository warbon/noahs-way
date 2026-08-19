import type { InquiryRecord } from "@/lib/inquiry-types"
import { siteConfig } from "@/lib/site-config"

/**
 * Outbound notification seam.
 *
 * Storing the inquiry is the source of truth; everything here is a best-effort
 * nudge, so a failure is logged and swallowed rather than failing the customer's
 * submission.
 *
 * Today only the webhook channel is implemented. To add email later, implement
 * `sendEmail` below with the chosen provider (Resend, SMTP, …) and nothing else
 * in the app needs to change — the route already awaits `notifyNewInquiry`.
 */

type NotificationChannel = {
  name: string
  isConfigured(): boolean
  send(inquiry: InquiryRecord): Promise<void>
}

function formatInquiry(inquiry: InquiryRecord) {
  const lines = [
    inquiry.packageTitle
      ? `New booking request — ${inquiry.packageTitle}`
      : "New booking request",
    `From: ${inquiry.name}`,
    `Mobile: ${inquiry.mobile}`,
    `Email: ${inquiry.email}`
  ]

  if (inquiry.destination) lines.push(`Destination: ${inquiry.destination}`)
  if (inquiry.airportOfOrigin) lines.push(`Departing from: ${inquiry.airportOfOrigin}`)

  if (inquiry.travelDateFrom || inquiry.travelDateTo) {
    lines.push(
      `Travel: ${inquiry.travelDateFrom ?? "?"} to ${inquiry.travelDateTo ?? "?"}` +
        (inquiry.flexibleOnPromoDates ? " (flexible for promo fares)" : "")
    )
  }

  if (inquiry.adults || inquiry.children) {
    lines.push(
      `Travellers: ${inquiry.adults ?? 0} adult(s), ${inquiry.children ?? 0} child(ren)` +
        (inquiry.childAges ? ` — ages ${inquiry.childAges}` : "")
    )
  }

  if (inquiry.travelType) lines.push(`Travel type: ${inquiry.travelType}`)
  if (inquiry.message) lines.push("", inquiry.message)

  lines.push("", `Inbox: ${siteConfig.url}/admin/inquiries`)
  return lines.join("\n")
}

const webhookChannel: NotificationChannel = {
  name: "webhook",
  isConfigured: () => Boolean(process.env.INQUIRY_NOTIFY_WEBHOOK_URL?.trim()),
  async send(inquiry) {
    await fetch(process.env.INQUIRY_NOTIFY_WEBHOOK_URL!.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: formatInquiry(inquiry) })
    })
  }
}

/**
 * Not implemented yet — pending a provider decision. When wired, this should
 * send two messages: an alert to the business and a receipt to the customer,
 * confirming the 24-hour reply promise the contact section makes.
 */
const emailChannel: NotificationChannel = {
  name: "email",
  isConfigured: () => false,
  async send() {
    /* intentionally empty until a provider is chosen */
  }
}

const channels: NotificationChannel[] = [webhookChannel, emailChannel]

export async function notifyNewInquiry(inquiry: InquiryRecord) {
  const active = channels.filter((channel) => channel.isConfigured())

  if (active.length === 0) {
    // Loud on purpose: a lead nobody is told about is the failure mode this
    // whole feature exists to prevent.
    console.warn(
      `[inquiry] No notification channel configured — inquiry ${inquiry.id} is stored but nobody was alerted. ` +
        "Set INQUIRY_NOTIFY_WEBHOOK_URL to enable alerts."
    )
    return
  }

  await Promise.all(
    active.map(async (channel) => {
      try {
        await channel.send(inquiry)
      } catch (error) {
        console.error(`[inquiry] ${channel.name} notification failed`, error)
      }
    })
  )
}
