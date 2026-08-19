import fs from "node:fs/promises"
import path from "node:path"

import { kv } from "@vercel/kv"

function getJsonPath() {
  return process.env.PACKAGE_JSON_PATH || path.join(process.cwd(), "data", "packages.json")
}

function getCatalogKey() {
  return process.env.PACKAGE_CATALOG_KV_KEY?.trim() || "packages:catalog"
}

function isCategory(value) {
  return value === "local" || value === "international"
}

function normalizePackage(value, category, index) {
  if (!value || typeof value !== "object") return null

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : `${category}-${Date.now()}-${index}`

  if (value.category !== undefined && !isCategory(value.category)) return null
  if (typeof value.title !== "string") return null
  if (typeof value.details !== "string") return null
  if (typeof value.imagePath !== "string") return null
  if (typeof value.previewImage !== "string") return null
  if (typeof value.price !== "string") return null

  return {
    id,
    category,
    title: value.title,
    details: value.details,
    imagePath: value.imagePath,
    previewImage: value.previewImage,
    price: value.price
  }
}

async function main() {
  const raw = await fs.readFile(getJsonPath(), "utf8")
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid JSON root")
  }

  const local = Array.isArray(parsed.local) ? parsed.local : []
  const international = Array.isArray(parsed.international) ? parsed.international : []

  const catalog = {
    local: local.map((pkg, index) => normalizePackage(pkg, "local", index)).filter(Boolean),
    international: international
      .map((pkg, index) => normalizePackage(pkg, "international", index))
      .filter(Boolean)
  }

  await kv.set(getCatalogKey(), catalog)

  console.log(
    `Seeded KV key "${getCatalogKey()}" with ${catalog.local.length} local and ` +
      `${catalog.international.length} international packages.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
