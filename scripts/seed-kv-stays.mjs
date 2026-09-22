import fs from "node:fs/promises"
import path from "node:path"

import { kv } from "@vercel/kv"

/**
 * Pushes data/stays.json into the KV store the deployed site reads.
 *
 * The companion to seed-kv-from-json.mjs. Unlike packages, stays have no seed
 * fixture to fall back on — an empty file means an empty store, which is the
 * correct state for a business that has not listed a unit yet.
 */

function getJsonPath() {
  return process.env.STAY_JSON_PATH || path.join(process.cwd(), "data", "stays.json")
}

function getStoreKey() {
  return process.env.STAY_CATALOG_KV_KEY?.trim() || "stays:catalog"
}

function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeStay(value, index) {
  if (!value || typeof value !== "object") return null

  if (typeof value.title !== "string") return null
  if (typeof value.details !== "string") return null
  if (typeof value.imagePath !== "string") return null
  if (typeof value.previewImage !== "string") return null
  if (typeof value.city !== "string") return null
  if (typeof value.nightlyRate !== "number" || !Number.isFinite(value.nightlyRate)) return null
  if (typeof value.bedrooms !== "number") return null
  if (typeof value.maxGuests !== "number") return null

  const id =
    typeof value.id === "string" && value.id.trim() ? value.id.trim() : `stay-${Date.now()}-${index}`

  // Blocked ranges are copied through rather than rebuilt, but anything
  // malformed is dropped here rather than being pushed live — a bad range would
  // paint the wrong nights as unavailable on the public calendar.
  const blocks = Array.isArray(value.blocks)
    ? value.blocks.filter(
        (block) =>
          block &&
          typeof block === "object" &&
          isDateString(block.from) &&
          isDateString(block.to) &&
          block.from < block.to
      )
    : []

  return { ...value, id, blocks }
}

async function main() {
  const raw = await fs.readFile(getJsonPath(), "utf8")
  const parsed = JSON.parse(raw)

  if (!Array.isArray(parsed)) {
    throw new Error("data/stays.json must contain a JSON array")
  }

  const stays = parsed.map(normalizeStay).filter(Boolean)
  const dropped = parsed.length - stays.length

  await kv.set(getStoreKey(), stays)

  console.log(
    `Seeded KV key "${getStoreKey()}" with ${stays.length} stay${stays.length === 1 ? "" : "s"}.` +
      (dropped > 0 ? ` ${dropped} record(s) were invalid and skipped.` : "")
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
