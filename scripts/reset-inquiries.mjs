/**
 * Deletes every stored inquiry. Use after changing the inquiry shape, while the
 * form is still in development and old records are not worth migrating.
 *
 * Dry-run by default:
 *   node --env-file=.env.local scripts/reset-inquiries.mjs
 *   node --env-file=.env.local scripts/reset-inquiries.mjs --apply
 *
 * Clears the local JSON store always, and the KV store when PACKAGE_STORE=kv.
 */
import fs from "node:fs/promises"
import path from "node:path"

const APPLY = process.argv.includes("--apply")
const JSON_PATH = path.join(process.cwd(), "data", "inquiries.json")

async function resetFileStore() {
  try {
    const raw = await fs.readFile(JSON_PATH, "utf8")
    const count = JSON.parse(raw).length
    if (APPLY) await fs.rm(JSON_PATH)
    console.log(`file store: ${count} inquiry(ies)${APPLY ? " deleted" : " would be deleted"}`)
  } catch {
    console.log("file store: nothing to delete")
  }
}

async function resetKvStore() {
  if (process.env.PACKAGE_STORE?.trim().toLowerCase() !== "kv") {
    console.log("kv store: skipped (PACKAGE_STORE is not 'kv')")
    return
  }

  const { kv } = await import("@vercel/kv")
  const indexKey = process.env.INQUIRY_INDEX_KV_KEY?.trim() || "inquiries:index"
  const ids = (await kv.lrange(indexKey, 0, -1)) ?? []

  console.log(`kv store: ${ids.length} inquiry(ies)${APPLY ? " deleting…" : " would be deleted"}`)

  if (!APPLY) return

  for (const id of ids) await kv.del(`inquiry:${id}`)
  await kv.del(indexKey)
  console.log("kv store: cleared")
}

await resetFileStore()
await resetKvStore()

if (!APPLY) console.log("\nDry run — pass --apply to delete.")
