import { createAnthropicProvider } from "@/lib/ai/providers/anthropic-provider"
import { createOpenAiProvider } from "@/lib/ai/providers/openai-provider"
import { AgentError, type AgentProvider } from "@/lib/ai/provider-types"

export type AgentProviderName = "anthropic" | "openai"

/**
 * Mirrors `getRepository()` in lib/inquiry-repository.ts: one env var picks the
 * implementation, and an unset var falls back to whichever key is present so a
 * developer with only one account does not have to configure two things.
 */
export function getAgentProviderName(): AgentProviderName {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (configured === "openai") return "openai"
  if (configured === "anthropic") return "anthropic"

  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic"
  if (process.env.OPENAI_API_KEY?.trim()) return "openai"
  return "anthropic"
}

/**
 * Whether the assistant can actually run. The UI gates the launcher on this so
 * a deployment without keys ships a site that is unchanged rather than broken.
 */
export function isAgentConfigured() {
  return getAgentProviderName() === "openai"
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

let cached: { name: AgentProviderName; provider: AgentProvider } | undefined

export function getAgentProvider(): AgentProvider {
  const name = getAgentProviderName()

  if (!isAgentConfigured()) {
    throw new AgentError(
      "unconfigured",
      `No API key configured for the "${name}" assistant provider`
    )
  }

  if (cached?.name !== name) {
    cached = {
      name,
      provider: name === "openai" ? createOpenAiProvider() : createAnthropicProvider()
    }
  }

  return cached.provider
}
