import { kv } from "@vercel/kv"

import {
  defaultFacebookSettings,
  normalizeFacebookSettings,
  type FacebookSettingsRecord,
  type FacebookSettingsRepository
} from "@/lib/facebook/settings-types"

const DEFAULT_SETTINGS_KEY = "facebook:settings"

function getSettingsKey() {
  return process.env.FACEBOOK_SETTINGS_KV_KEY?.trim() || DEFAULT_SETTINGS_KEY
}

async function readFacebookSettings(): Promise<FacebookSettingsRecord> {
  try {
    // @vercel/kv deserializes JSON automatically.
    const raw = await kv.get<unknown>(getSettingsKey())
    return normalizeFacebookSettings(raw)
  } catch (error) {
    // A KV outage must not break the admin panel; defaults mean "nothing
    // configured here", which falls back to the environment.
    console.error("[facebook] Could not read settings from KV", error)
    return defaultFacebookSettings()
  }
}

async function writeFacebookSettings(record: FacebookSettingsRecord): Promise<void> {
  await kv.set(getSettingsKey(), record)
}

export const kvFacebookSettingsRepository: FacebookSettingsRepository = {
  readFacebookSettings,
  writeFacebookSettings
}
