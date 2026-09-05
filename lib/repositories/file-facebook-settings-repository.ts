import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  defaultFacebookSettings,
  normalizeFacebookSettings,
  type FacebookSettingsRecord,
  type FacebookSettingsRepository
} from "@/lib/facebook/settings-types"

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const FACEBOOK_SETTINGS_JSON_PATH = path.join(DATA_DIR_PATH, "facebook-settings.json")

/** Returns defaults when the file is absent — a fresh checkout configures nothing. */
async function readFacebookSettings(): Promise<FacebookSettingsRecord> {
  try {
    const raw = await readFile(FACEBOOK_SETTINGS_JSON_PATH, "utf8")
    return normalizeFacebookSettings(JSON.parse(raw))
  } catch {
    return defaultFacebookSettings()
  }
}

async function writeFacebookSettings(record: FacebookSettingsRecord): Promise<void> {
  await mkdir(DATA_DIR_PATH, { recursive: true })
  // Written 0600 for the same reason as the AI settings file: it holds an
  // encrypted token, on a machine that usually also holds the decryption secret.
  await writeFile(FACEBOOK_SETTINGS_JSON_PATH, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  })
}

export const fileFacebookSettingsRepository: FacebookSettingsRepository = {
  readFacebookSettings,
  writeFacebookSettings
}
