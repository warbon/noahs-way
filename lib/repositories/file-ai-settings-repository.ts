import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  defaultAiSettings,
  normalizeAiSettings,
  type AiSettingsRecord,
  type AiSettingsRepository
} from "@/lib/ai/settings-types"

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const AI_SETTINGS_JSON_PATH = path.join(DATA_DIR_PATH, "ai-settings.json")

/** Returns defaults when the file is absent — a fresh checkout configures nothing. */
async function readAiSettings(): Promise<AiSettingsRecord> {
  try {
    const raw = await readFile(AI_SETTINGS_JSON_PATH, "utf8")
    return normalizeAiSettings(JSON.parse(raw))
  } catch {
    return defaultAiSettings()
  }
}

async function writeAiSettings(record: AiSettingsRecord): Promise<void> {
  await mkdir(DATA_DIR_PATH, { recursive: true })
  // Written 0600: the file holds encrypted keys, but the machine that can read
  // it is usually the machine holding ADMIN_SESSION_SECRET too.
  await writeFile(AI_SETTINGS_JSON_PATH, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  })
}

export const fileAiSettingsRepository: AiSettingsRepository = {
  readAiSettings,
  writeAiSettings
}
