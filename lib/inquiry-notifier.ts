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
 * The receipt the customer actually reads.
 *
 * The contact form promises a reply within 24 hours; silence after submitting
 * reads as "this business is not operating", which is the most expensive moment
 * to lose someone — they had already decided.
 */
function customerReceipt(inquiry: InquiryRecord) {
  const lines = [
    `Hi ${inquiry.name.split(" ")[0] || inquiry.name},`,
    "",
    inquiry.packageTitle
      ? `Thanks for your booking request for ${inquiry.packageTitle}. We've got it.`
      : "Thanks for your enquiry. We've got it.",
    "",
    "One of our trip specialists will come back to you within 24 hours with availability and a final quote. If it's urgent, call us on " +
      `${siteConfig.phone} — we're open ${siteConfig.hours}.`,
    ""
  ]

  if (inquiry.destination) lines.push(`Destination: ${inquiry.destination}`)
  if (inquiry.travelDateFrom || inquiry.travelDateTo) {
    lines.push(`Travel dates: ${inquiry.travelDateFrom ?? "?"} to ${inquiry.travelDateTo ?? "?"}`)
  }
  if (inquiry.adults || inquiry.children) {
    lines.push(
      `Travellers: ${inquiry.adults ?? 0} adult(s), ${inquiry.children ?? 0} child(ren)`
    )
  }

  lines.push(
    "",
    "A reminder before you pay anyone: we only ever collect payment through our registered business accounts, and the details come with your quote.",
    "",
    siteConfig.name,
    siteConfig.phone,
    siteConfig.url
  )

  return lines.join("\n")
}

type ResendPayload = { to: string; subject: string; text: string; replyTo?: string }

async function sendViaResend({ to, subject, text, replyTo }: ResendPayload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.INQUIRY_EMAIL_FROM!.trim(),
      to,
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  })

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`)
  }
}

/**
 * Sends two messages: an alert to the business, and a receipt to the customer.
 *
 * The customer receipt is the one that can't silently fail, so it is sent first
 * and its failure is what surfaces — a missing internal alert still leaves the
 * lead sitting in the admin inbox, but a missing receipt leaves a person
 * wondering whether they were scammed.
 */
const emailChannel: NotificationChannel = {
  name: "email",
  isConfigured: () =>
    Boolean(process.env.RESEND_API_KEY?.trim() && process.env.INQUIRY_EMAIL_FROM?.trim()),
  async send(inquiry) {
    const salesInbox = process.env.INQUIRY_EMAIL_TO?.trim() || siteConfig.email

    // Sent independently, not in sequence. A customer who mistypes their own
    // address is common, and awaiting the receipt first meant its rejection
    // skipped the internal alert entirely — losing the business the very lead
    // this channel exists to deliver.
    const [receipt, alert] = await Promise.allSettled([
      sendViaResend({
        to: inquiry.email,
        subject: inquiry.packageTitle
          ? `We received your booking request — ${inquiry.packageTitle}`
          : "We received your enquiry",
        text: customerReceipt(inquiry),
        replyTo: salesInbox
      }),
      sendViaResend({
        to: salesInbox,
        subject: inquiry.packageTitle
          ? `New booking request — ${inquiry.packageTitle}`
          : "New booking request",
        text: formatInquiry(inquiry),
        replyTo: inquiry.email
      })
    ])

    // Report separately so the log says which half failed — a bounced receipt
    // and an undelivered internal alert need very different responses.
    if (receipt.status === "rejected") {
      console.error(`[inquiry] receipt to ${inquiry.email} failed`, receipt.reason)
    }
    if (alert.status === "rejected") {
      throw alert.reason
    }
  }
}

const channels: NotificationChannel[] = [webhookChannel, emailChannel]

export async function notifyNewInquiry(inquiry: InquiryRecord) {
  const active = channels.filter((channel) => channel.isConfigured())

  if (active.length === 0) {
    // Loud on purpose: a lead nobody is told about is the failure mode this
    // whole feature exists to prevent.
    console.warn(
      `[inquiry] No notification channel configured — inquiry ${inquiry.id} is stored but nobody was alerted, ` +
        "and the customer received no confirmation despite the 24-hour promise on the form. " +
        "Set RESEND_API_KEY + INQUIRY_EMAIL_FROM for email, or INQUIRY_NOTIFY_WEBHOOK_URL for a webhook alert."
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
