import { kv } from "@vercel/kv"

import {
  defaultAiSettings,
  normalizeAiSettings,
  type AiSettingsRecord,
  type AiSettingsRepository
} from "@/lib/ai/settings-types"

const DEFAULT_SETTINGS_KEY = "ai:settings"

function getSettingsKey() {
  return process.env.AI_SETTINGS_KV_KEY?.trim() || DEFAULT_SETTINGS_KEY
}

async function readAiSettings(): Promise<AiSettingsRecord> {
  try {
    // @vercel/kv deserializes JSON automatically.
    const raw = await kv.get<unknown>(getSettingsKey())
    return normalizeAiSettings(raw)
  } catch (error) {
    // A KV outage must not hide the whole site's chat behind an exception —
    // defaults mean "nothing configured here", which falls back to the env.
    console.error("[ai-settings] Could not read settings from KV", error)
    return defaultAiSettings()
  }
}

async function writeAiSettings(record: AiSettingsRecord): Promise<void> {
  await kv.set(getSettingsKey(), record)
}

export const kvAiSettingsRepository: AiSettingsRepository = {
  readAiSettings,
  writeAiSettings
}
