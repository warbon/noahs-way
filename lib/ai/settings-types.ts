import { isAiProviderName, type AiProviderName } from "@/lib/ai/models"

/**
 * Admin-managed configuration for the booking assistant.
 *
 * Every field is nullable on purpose: null means "not decided here", and the
 * resolver in lib/ai/config.ts falls through to the environment variable. That
 * keeps deployments that were configured before this panel existed working
 * unchanged, and lets an admin hand one setting back to the environment without
 * having to hand over all of them.
 */

export type AiProviderSettings = {
  /** AES-GCM ciphertext from lib/ai/secret-box.ts. Never plaintext. */
  apiKey: string | null
  /** Last four characters, so the panel can show which key is stored. */
  apiKeyPreview: string | null
  /** null uses the provider's default model. */
  model: string | null
}

export type AiSettingsRecord = {
  /**
   * The master switch, and the one setting that does not fall through to the
   * environment. It defaults to OFF: a key sitting in the environment is not
   * consent to spend it, and an assistant that talks to customers should go
   * live because somebody switched it on, not because a variable happened to
   * be set. Admin -> AI Assistant is the only thing that flips it.
   */
  enabled: boolean
  /** null picks the provider the way the environment always did. */
  provider: AiProviderName | null
  anthropic: AiProviderSettings
  openai: AiProviderSettings
  updatedAt: string | null
}

/**
 * A patch, not a replacement. An omitted field is left alone; an explicit null
 * on `apiKey` clears the stored key. The panel never round-trips a key it
 * cannot see, so "unchanged" has to be expressible.
 */
export type AiProviderSettingsUpdate = {
  apiKey?: string | null
  model?: string | null
}

export type AiSettingsUpdate = {
  enabled?: boolean
  provider?: AiProviderName | null
  anthropic?: AiProviderSettingsUpdate
  openai?: AiProviderSettingsUpdate
}

export type AiSettingsRepository = {
  readAiSettings(): Promise<AiSettingsRecord>
  writeAiSettings(record: AiSettingsRecord): Promise<void>
}

export function emptyProviderSettings(): AiProviderSettings {
  return { apiKey: null, apiKeyPreview: null, model: null }
}

export function defaultAiSettings(): AiSettingsRecord {
  return {
    enabled: false,
    provider: null,
    anthropic: emptyProviderSettings(),
    openai: emptyProviderSettings(),
    updatedAt: null
  }
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeProviderSettings(value: unknown): AiProviderSettings {
  if (!value || typeof value !== "object") return emptyProviderSettings()

  const record = value as Record<string, unknown>
  const apiKey = readNullableString(record.apiKey)

  return {
    apiKey,
    // A preview without a key is meaningless and would show a stale hint.
    apiKeyPreview: apiKey ? readNullableString(record.apiKeyPreview) : null,
    model: readNullableString(record.model)
  }
}

/**
 * Coerces whatever the store holds into a usable record.
 *
 * Written defensively rather than validated strictly: a malformed settings blob
 * must not be able to take the storefront down, so anything unrecognised falls
 * back to the default for that field.
 */
export function normalizeAiSettings(value: unknown): AiSettingsRecord {
  if (!value || typeof value !== "object") return defaultAiSettings()

  const record = value as Record<string, unknown>

  return {
    // Anything other than an explicit `true` leaves the assistant off.
    enabled: record.enabled === true,
    provider: isAiProviderName(record.provider) ? record.provider : null,
    anthropic: normalizeProviderSettings(record.anthropic),
    openai: normalizeProviderSettings(record.openai),
    updatedAt: readNullableString(record.updatedAt)
  }
}

/**
 * What the admin panel is allowed to see.
 *
 * The API key never appears here in any form beyond its last four characters —
 * the browser has no use for the key itself, and a settings endpoint that can
 * hand one back turns an admin session hijack into a credential leak.
 */

/** Where the key the assistant would actually use comes from. */
export type AiKeySource = "settings" | "env" | "none"

export type PublicAiProviderSettings = {
  model: string | null
  hasStoredKey: boolean
  /** Last four characters of the stored key, or null when none is stored. */
  keyPreview: string | null
  /** Whether the matching environment variable would cover this provider. */
  hasEnvKey: boolean
}

export type PublicAiSettings = {
  enabled: boolean
  provider: AiProviderName | null
  anthropic: PublicAiProviderSettings
  openai: PublicAiProviderSettings
  updatedAt: string | null
  /** What the stored settings and the environment add up to, after precedence. */
  resolved: {
    provider: AiProviderName
    model: string
    keySource: AiKeySource
    available: boolean
    storedKeyUnreadable: boolean
  }
}
