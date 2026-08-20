import {
  DEFAULT_AI_MODELS,
  isAiProviderName,
  type AiProviderName
} from "@/lib/ai/models"
import { decryptSecret } from "@/lib/ai/secret-box"
import { getAiSettings } from "@/lib/ai/settings-repository"
import type { AiKeySource, AiSettingsRecord } from "@/lib/ai/settings-types"

/**
 * Turns stored settings plus the environment into the one config the assistant
 * actually runs on.
 *
 * Precedence is admin panel first, environment second. That ordering is what
 * makes the panel authoritative without breaking a deployment that still
 * configures the assistant the old way — an untouched panel resolves to exactly
 * the values AI_PROVIDER / AI_MODEL / *_API_KEY produced before it existed.
 */

export type ResolvedAgentConfig = {
  /** The admin master switch, independent of whether a key exists. */
  enabled: boolean
  provider: AiProviderName
  model: string
  apiKey: string | null
  keySource: AiKeySource
  /** True only when the assistant can actually answer: switched on and keyed. */
  available: boolean
  /** A stored key that would not decrypt — surfaced so it can be re-entered. */
  storedKeyUnreadable: boolean
}

function readEnvProvider(): AiProviderName | null {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase()
  return isAiProviderName(configured) ? configured : null
}

function readEnvApiKey(provider: AiProviderName) {
  const value =
    provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  return value?.trim() || null
}

function hasAnyKey(settings: AiSettingsRecord, provider: AiProviderName) {
  return Boolean(settings[provider].apiKey || readEnvApiKey(provider))
}

/**
 * Mirrors the old env-only rule: an explicit choice wins, otherwise fall back
 * to whichever provider is keyed, so an operator with one account never has to
 * configure two things.
 */
function resolveProviderName(settings: AiSettingsRecord): AiProviderName {
  if (settings.provider) return settings.provider

  const fromEnv = readEnvProvider()
  if (fromEnv) return fromEnv

  if (hasAnyKey(settings, "anthropic")) return "anthropic"
  if (hasAnyKey(settings, "openai")) return "openai"
  return "anthropic"
}

/**
 * The last ciphertext we complained about, so a rotated ADMIN_SESSION_SECRET
 * logs once per instance rather than once per page view. This runs on the
 * render path of every public page; the admin panel is where the condition is
 * meant to be noticed, not the log drain.
 */
let warnedUndecryptableKey: string | undefined

export function resolveAgentConfigFrom(settings: AiSettingsRecord): ResolvedAgentConfig {
  const provider = resolveProviderName(settings)
  const stored = settings[provider]

  let apiKey: string | null = null
  let keySource: AiKeySource = "none"
  let storedKeyUnreadable = false

  if (stored.apiKey) {
    apiKey = decryptSecret(stored.apiKey)
    if (apiKey) {
      keySource = "settings"
    } else {
      // Almost always a rotated ADMIN_SESSION_SECRET. Degrade to the
      // environment rather than take the assistant offline outright.
      storedKeyUnreadable = true
      if (warnedUndecryptableKey !== stored.apiKey) {
        warnedUndecryptableKey = stored.apiKey
        console.error(
          `[ai-settings] Stored ${provider} key could not be decrypted; falling back to the environment`
        )
      }
    }
  }

  if (!apiKey) {
    apiKey = readEnvApiKey(provider)
    if (apiKey) keySource = "env"
  }

  return {
    enabled: settings.enabled,
    provider,
    model: stored.model ?? (process.env.AI_MODEL?.trim() || DEFAULT_AI_MODELS[provider]),
    apiKey,
    keySource,
    available: settings.enabled && Boolean(apiKey),
    storedKeyUnreadable
  }
}

export async function resolveAgentConfig(): Promise<ResolvedAgentConfig> {
  return resolveAgentConfigFrom(await getAiSettings())
}

/**
 * Whether the assistant can actually run. The UI gates the launcher on this so
 * a deployment without keys — or one an admin has switched off — ships a site
 * that is unchanged rather than broken.
 */
export async function isAgentAvailable() {
  return (await resolveAgentConfig()).available
}
