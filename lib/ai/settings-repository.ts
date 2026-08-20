import { unstable_noStore as noStore } from "next/cache"

import { MAX_API_KEY_LENGTH, MIN_API_KEY_LENGTH } from "@/lib/ai/models"
import { encryptSecret, previewSecret } from "@/lib/ai/secret-box"
import {
  emptyProviderSettings,
  type AiProviderSettings,
  type AiProviderSettingsUpdate,
  type AiSettingsRecord,
  type AiSettingsRepository,
  type AiSettingsUpdate
} from "@/lib/ai/settings-types"
import { fileAiSettingsRepository } from "@/lib/repositories/file-ai-settings-repository"
import { kvAiSettingsRepository } from "@/lib/repositories/kv-ai-settings-repository"

function getRepository(): AiSettingsRepository {
  // Mirrors the package and inquiry repositories so every store switches together.
  return process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv"
    ? kvAiSettingsRepository
    : fileAiSettingsRepository
}

/**
 * `noStore()` because the storefront reads this on every page render to decide
 * whether the chat launcher exists. Without it Next can cache the underlying
 * fetch to KV and an admin's toggle would appear to do nothing.
 */
export async function getAiSettings(): Promise<AiSettingsRecord> {
  noStore()
  return getRepository().readAiSettings()
}

export class AiSettingsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AiSettingsValidationError"
  }
}

/**
 * Keys are checked for shape only. Whether the provider accepts it is a
 * question only the provider can answer — that is what the panel's Test button
 * is for — but catching a truncated paste or a pasted placeholder here saves an
 * admin from a chat that silently 500s.
 */
function toStoredApiKey(value: string): Pick<AiProviderSettings, "apiKey" | "apiKeyPreview"> {
  const apiKey = value.trim()

  if (/\s/.test(apiKey)) {
    throw new AiSettingsValidationError("API key must not contain spaces or line breaks")
  }
  if (apiKey.length < MIN_API_KEY_LENGTH || apiKey.length > MAX_API_KEY_LENGTH) {
    throw new AiSettingsValidationError("That does not look like a complete API key")
  }

  return { apiKey: encryptSecret(apiKey), apiKeyPreview: previewSecret(apiKey) }
}

function applyProviderUpdate(
  current: AiProviderSettings,
  update: AiProviderSettingsUpdate | undefined
): AiProviderSettings {
  if (!update) return current

  const next: AiProviderSettings = { ...current }

  if ("model" in update) {
    const model = update.model?.trim()
    next.model = model ? model : null
  }

  if ("apiKey" in update) {
    if (update.apiKey === null || update.apiKey === undefined || update.apiKey.trim() === "") {
      // Explicit clear. An omitted `apiKey` never reaches here, so a save that
      // leaves the password field blank keeps the existing key.
      next.apiKey = null
      next.apiKeyPreview = null
    } else {
      Object.assign(next, toStoredApiKey(update.apiKey))
    }
  }

  return next
}

/**
 * Read-modify-write. The last admin to press Save wins, which is the same
 * bargain the package and inquiry repositories make and fine for a panel with
 * one operator.
 */
export async function updateAiSettings(update: AiSettingsUpdate): Promise<AiSettingsRecord> {
  const repository = getRepository()
  const current = await repository.readAiSettings()

  const next: AiSettingsRecord = {
    ...current,
    enabled: update.enabled ?? current.enabled,
    provider: "provider" in update ? update.provider ?? null : current.provider,
    anthropic: applyProviderUpdate(current.anthropic ?? emptyProviderSettings(), update.anthropic),
    openai: applyProviderUpdate(current.openai ?? emptyProviderSettings(), update.openai),
    updatedAt: new Date().toISOString()
  }

  await repository.writeAiSettings(next)
  return next
}

