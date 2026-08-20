import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import {
  CHAT_COOKIE_NAME,
  clearBookingDraft,
  isValidSessionId,
  readBookingDraft
} from "@/lib/ai/chat-store"
import { submitInquiry } from "@/lib/inquiry-submission"
import { checkInquiryRateLimit } from "@/lib/rate-limit"
import { getClientIp } from "@/lib/request-ip"
import { messengerHref } from "@/lib/site-config"

/**
 * The only way a chat conversation becomes a lead.
 *
 * Deliberately takes no booking data from the request: it loads the draft the
 * assistant staged in KV under the session cookie. The model cannot call this,
 * and a tampered browser cannot smuggle different values through it — the worst
 * a forged request can do is submit the draft the visitor was already shown.
 */
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(CHAT_COOKIE_NAME)?.value

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json(
      { error: `This conversation has expired. Please message us on Messenger: ${messengerHref}` },
      { status: 410 }
    )
  }

  // Shares the public inquiry limiter: a lead is a lead, whichever form it
  // arrives through, and this must not become a way around that budget.
  const allowed = await checkInquiryRateLimit(getClientIp(request.headers))
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many booking requests sent. Please try again shortly." },
      { status: 429 }
    )
  }

  const draft = await readBookingDraft(sessionId)
  if (!draft) {
    return NextResponse.json(
      { error: "That booking request is no longer available. Please start again in the chat." },
      { status: 410 }
    )
  }

  const result = await submitInquiry(draft as unknown as Record<string, unknown>, {
    source: "chat-agent"
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // One draft, one submission — a double click cannot create a second lead.
  await clearBookingDraft(sessionId)
  revalidatePath("/admin/inquiries")

  return NextResponse.json({ ok: true, reference: result.inquiry.id }, { status: 201 })
}
