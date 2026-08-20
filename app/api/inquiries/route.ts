import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { submitInquiry } from "@/lib/inquiry-submission"
import { getClientIp } from "@/lib/request-ip"
import { checkInquiryRateLimit } from "@/lib/rate-limit"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse("Invalid request body", 400)
  }

  const body = payload as Record<string, unknown>

  // Honeypot: a real browser leaves this hidden field empty. Bots fill it in.
  // Respond 200 so the bot can't distinguish rejection from success.
  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ ok: true })
  }

  const allowed = await checkInquiryRateLimit(getClientIp(request.headers))
  if (!allowed) {
    return errorResponse("Too many inquiries sent. Please try again shortly.", 429)
  }

  // Validation, package snapshotting, persistence and notification all live in
  // lib/inquiry-submission.ts, shared with the chat assistant's booking route.
  const result = await submitInquiry(body)
  if (!result.ok) {
    return errorResponse(result.error, result.status)
  }

  revalidatePath("/admin/inquiries")

  return NextResponse.json({ ok: true }, { status: 201 })
}
