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
 * Override it from Admin → AI Assistant — an Opus if a future change makes
 * the assistant reason harder.
 */
export const DEFAULT_AI_MODELS: Record<AiProviderName, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4.1"
}

export type AiModelOption = {
  id: string
  label: string
  /** Why pick it, in a few words, shown beside the name. */
  note: string
}

/**
 * The models offered in the admin's Model dropdown, best default first.
 *
 * Only models that accept what the assistant sends: adaptive thinking at low
 * effort, with tools left to the model's choice. Claude Haiku 4.5 is left off
 * for that reason — it rejects both adaptive thinking and the effort setting,
 * so every chat would fail. A model missing here can still be typed in under
 * "Other model id", and Test connection confirms it before customers see it.
 */
export const AI_MODEL_OPTIONS: Record<AiProviderName, AiModelOption[]> = {
  anthropic: [
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "recommended, measured on this assistant" },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "newest Sonnet, same price" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "strongest, about 2× the cost" },
    { id: "claude-opus-5", label: "Claude Opus 5", note: "previous Opus, about 2.5× the cost" }
  ],
  openai: [
    { id: "gpt-4.1", label: "GPT-4.1", note: "recommended" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini", note: "cheaper, lighter" }
  ]
}

/** "Claude Sonnet 5" for a listed id, the id itself otherwise. */
export function aiModelLabel(provider: AiProviderName, id: string) {
  return AI_MODEL_OPTIONS[provider].find((option) => option.id === id)?.label ?? id
}

/** Long enough to reject a truncated paste, loose enough to survive key format changes. */
export const MIN_API_KEY_LENGTH = 20
export const MAX_API_KEY_LENGTH = 500
