/**
 * Provider identities and model defaults, kept free of SDK imports.
 *
 * The admin panel, the settings repository and the storefront's launcher all
 * need this, and only the two adapter modules should ever pull in a vendor SDK.
 */

export const AI_PROVIDER_NAMES = ["anthropic", "openai"] as const

export type AiProviderName = (typeof AI_PROVIDER_NAMES)[number]

export function isAiProviderName(value: unknown): value is AiProviderName {
  return AI_PROVIDER_NAMES.includes(value as AiProviderName)
}

export const AI_PROVIDER_LABELS: Record<AiProviderName, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI"
}

/**
 * Sonnet 5 rather than Opus, measured rather than assumed.
 *
 * On a four-turn booking funnel it produced the same widget sequence and the
 * same grounded answers, ran faster, and cost ~38% less at list price. This
 * workload is short turns over a small catalog with well-specified tools, not
 * the kind of long-horizon reasoning that pays for an Opus-tier model.
 *
 * Override it from Admin → AI Assistant — claude-opus-5 if a future change
 * makes the assistant reason harder, claude-haiku-4-5 if cost becomes the
 * binding constraint (test tool-use reliability first).
 */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4.1"
}

/**
 * Datalist hints for the admin model field, not a whitelist.
 *
 * Providers ship new models faster than this file gets edited, so the field
 * stays free text and an unlisted id is accepted as typed.
 */
export const SUGGESTED_AI_MODELS: Record<AiProviderName, string[]> = {
  anthropic: ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4.1", "gpt-4.1-mini"]
}

/** Long enough to reject a truncated paste, loose enough to survive key format changes. */
export const MIN_API_KEY_LENGTH = 20
export const MAX_API_KEY_LENGTH = 500
