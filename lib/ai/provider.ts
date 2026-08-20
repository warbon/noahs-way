import crypto from "node:crypto"

import type { ResolvedAgentConfig } from "@/lib/ai/config"
import { createAnthropicProvider } from "@/lib/ai/providers/anthropic-provider"
import { createOpenAiProvider } from "@/lib/ai/providers/openai-provider"
import { AgentError, type AgentProvider } from "@/lib/ai/provider-types"

export type { AiProviderName as AgentProviderName } from "@/lib/ai/models"

/**
 * Adapters are handed their credentials rather than reading the environment,
 * because the environment is no longer the source of truth — Admin → AI
 * Assistant is, and a key can change between two requests to the same warm
 * instance.
 */
let cached: { key: string; provider: AgentProvider } | undefined

/** Identifies a credential set without keeping the key itself in a cache key. */
function cacheKeyFor(config: ResolvedAgentConfig, apiKey: string) {
  const fingerprint = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 16)
  return `${config.provider}:${config.model}:${fingerprint}`
}

export function getAgentProvider(config: ResolvedAgentConfig): AgentProvider {
  if (!config.enabled) {
    throw new AgentError("unconfigured", "The assistant is switched off in the admin panel")
  }

  if (!config.apiKey) {
    throw new AgentError(
      "unconfigured",
      `No API key configured for the "${config.provider}" assistant provider`
    )
  }

  const key = cacheKeyFor(config, config.apiKey)

  if (cached?.key !== key) {
    const options = { apiKey: config.apiKey, model: config.model }
    cached = {
      key,
      provider:
        config.provider === "openai"
          ? createOpenAiProvider(options)
          : createAnthropicProvider(options)
    }
  }

  return cached.provider
}
