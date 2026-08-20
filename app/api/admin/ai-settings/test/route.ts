import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { resolveAgentConfig } from "@/lib/ai/config"
import { getAgentProvider } from "@/lib/ai/provider"
import { AgentError } from "@/lib/ai/provider-types"

export const maxDuration = 30

/** Long enough for a cold provider, short enough that the button never hangs. */
const TEST_TIMEOUT_MS = 20_000

/**
 * Sends the smallest possible real turn against the saved configuration.
 *
 * Shape validation cannot tell a revoked key from a valid one, and the first
 * person to find out otherwise would be a visitor watching the assistant fail.
 * This is the one place an admin can confirm the key and the model id actually
 * work before trusting them.
 */
export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = await resolveAgentConfig()

  if (!config.apiKey) {
    return NextResponse.json(
      { ok: false, error: `No API key is configured for ${config.provider}.` },
      { status: 200 }
    )
  }

  // Deliberately ignores `enabled`: an admin needs to be able to verify a key
  // before switching the assistant on.
  const provider = getAgentProvider({ ...config, enabled: true })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS)

  try {
    let reply = ""

    for await (const event of provider.streamTurn({
      system: "Reply with the single word OK.",
      messages: [{ role: "user", parts: [{ type: "text", text: "ping" }] }],
      tools: [],
      signal: controller.signal
    })) {
      if (event.type === "text_delta") reply += event.text
    }

    return NextResponse.json({
      ok: true,
      provider: provider.name,
      model: provider.model,
      reply: reply.trim().slice(0, 120)
    })
  } catch (error) {
    // Abort is checked first: the SDKs wrap a cancelled stream in their own
    // APIError subclass, which the adapter turns into an AgentError, so testing
    // for AgentError first would swallow the timeout as "API error undefined".
    const message = controller.signal.aborted
      ? "The provider did not respond in time"
      : error instanceof AgentError
        ? error.message
        : "The provider request failed"

    console.error(`[ai-settings] Connection test failed for ${config.provider}`, error)
    return NextResponse.json({ ok: false, provider: config.provider, model: config.model, error: message })
  } finally {
    clearTimeout(timeout)
  }
}
