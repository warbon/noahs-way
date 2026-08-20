import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { resolveAgentConfigFrom } from "@/lib/ai/config"
import { AI_PROVIDER_NAMES, isAiProviderName } from "@/lib/ai/models"
import {
  AiSettingsValidationError,
  getAiSettings,
  updateAiSettings
} from "@/lib/ai/settings-repository"
import type {
  AiProviderSettingsUpdate,
  AiSettingsRecord,
  AiSettingsUpdate,
  PublicAiSettings
} from "@/lib/ai/settings-types"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function hasEnvKey(provider: string) {
  const value = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY
  return Boolean(value?.trim())
}

/** Strips the ciphertext before anything leaves the server. */
function toPublicSettings(settings: AiSettingsRecord): PublicAiSettings {
  const resolved = resolveAgentConfigFrom(settings)

  return {
    enabled: settings.enabled,
    provider: settings.provider,
    anthropic: {
      model: settings.anthropic.model,
      hasStoredKey: Boolean(settings.anthropic.apiKey),
      keyPreview: settings.anthropic.apiKeyPreview,
      hasEnvKey: hasEnvKey("anthropic")
    },
    openai: {
      model: settings.openai.model,
      hasStoredKey: Boolean(settings.openai.apiKey),
      keyPreview: settings.openai.apiKeyPreview,
      hasEnvKey: hasEnvKey("openai")
    },
    updatedAt: settings.updatedAt,
    resolved: {
      provider: resolved.provider,
      model: resolved.model,
      keySource: resolved.keySource,
      available: resolved.available,
      storedKeyUnreadable: resolved.storedKeyUnreadable
    }
  }
}

/**
 * Reads one provider's patch out of the request body.
 *
 * The three states matter and are not interchangeable: an absent `apiKey` means
 * "keep what is stored" (the panel cannot echo a key back, so a plain Save must
 * not wipe it), while an explicit null means "remove it".
 *
 * Returns a result rather than a bare patch so a malformed field can be
 * rejected. Reporting it as "no patch" would silently drop the rest of the
 * object — a bad `model` would discard the `apiKey` beside it — and answer 200
 * to a caller that just lost its key.
 */
type ProviderUpdateResult =
  | { ok: true; update?: AiProviderSettingsUpdate }
  | { ok: false }

function readProviderUpdate(value: unknown): ProviderUpdateResult {
  if (value === undefined) return { ok: true }
  if (!value || typeof value !== "object") return { ok: false }

  const record = value as Record<string, unknown>
  const update: AiProviderSettingsUpdate = {}

  if ("model" in record) {
    if (record.model !== null && typeof record.model !== "string") return { ok: false }
    update.model = record.model as string | null
  }

  if ("apiKey" in record) {
    if (record.apiKey !== null && typeof record.apiKey !== "string") return { ok: false }
    update.apiKey = record.apiKey as string | null
  }

  return { ok: true, update: Object.keys(update).length > 0 ? update : undefined }
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  return NextResponse.json({ settings: toPublicSettings(await getAiSettings()) })
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

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
  const update: AiSettingsUpdate = {}

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return errorResponse("`enabled` must be a boolean", 400)
    update.enabled = body.enabled
  }

  if ("provider" in body) {
    // null is the "auto" choice — fall back to the environment's rule.
    if (body.provider !== null && !isAiProviderName(body.provider)) {
      return errorResponse(`\`provider\` must be null or one of: ${AI_PROVIDER_NAMES.join(", ")}`, 400)
    }
    update.provider = body.provider as AiSettingsUpdate["provider"]
  }

  for (const name of AI_PROVIDER_NAMES) {
    const result = readProviderUpdate(body[name])
    if (!result.ok) {
      return errorResponse(`\`${name}.model\` and \`${name}.apiKey\` must be a string or null`, 400)
    }
    if (result.update) update[name] = result.update
  }

  let saved: AiSettingsRecord
  try {
    saved = await updateAiSettings(update)
  } catch (error) {
    if (error instanceof AiSettingsValidationError) {
      return errorResponse(error.message, 400)
    }
    console.error("[ai-settings] Could not save settings", error)
    return errorResponse("Could not save settings", 500)
  }

  // The launcher is rendered on every public page, so a toggle has to reach all
  // of them — same set the package routes revalidate.
  revalidatePath("/")
  revalidatePath("/packages")

  return NextResponse.json({ settings: toPublicSettings(saved) })
}
