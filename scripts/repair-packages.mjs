/**
 * Backfills structured fields and quarantines unusable records.
 * Dry-run by default; pass --apply to write.
 *
 *   node scripts/repair-packages.mjs            # preview
 *   node scripts/repair-packages.mjs --apply    # write
 */
import fs from "node:fs"
import path from "node:path"

const APPLY = process.argv.includes("--apply")
const JSON_PATH = process.env.PACKAGE_JSON_PATH || path.join(process.cwd(), "data", "packages.json")
const PUBLIC_DIR = path.join(process.cwd(), "public")

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "package"
}

function parsePriceAmount(price) {
  if (!price) return undefined
  const match = String(price).replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  const value = match ? Number.parseFloat(match[0]) : undefined
  return Number.isFinite(value) ? value : undefined
}

function parseDuration(details) {
  const days = details?.match(/(\d+)\s*Days?/i)
  const nights = details?.match(/(\d+)\s*Nights?/i)
  return {
    durationDays: days ? Number.parseInt(days[1], 10) : undefined,
    durationNights: nights ? Number.parseInt(nights[1], 10) : undefined
  }
}

const catalog = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"))
const changes = []

for (const category of ["local", "international"]) {
  const seen = new Map()

  catalog[category] = (catalog[category] ?? []).map((pkg) => {
    const next = { ...pkg }
    const label = `${category}/${pkg.title}`

    // Stable, unique slug — persisted so a later rename can't break shared links.
    const base = pkg.slug || slugify(pkg.title)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const slug = count === 0 ? base : `${base}-${count + 1}`
    if (next.slug !== slug) {
      next.slug = slug
      changes.push(`${label}: slug -> ${slug}`)
    }

    const amount = parsePriceAmount(pkg.price)
    if (amount !== undefined && next.priceAmount === undefined) {
      next.priceAmount = amount
      next.currency = next.currency ?? "PHP"
      changes.push(`${label}: priceAmount -> ${amount}`)
    }

    const { durationDays, durationNights } = parseDuration(pkg.details)
    if (durationDays && next.durationDays === undefined) next.durationDays = durationDays
    if (durationNights && next.durationNights === undefined) next.durationNights = durationNights

    // Quarantine records whose only content (the poster) is missing, rather
    // than showing a customer an empty package page.
    const imageMissing =
      pkg.imagePath?.startsWith("/") && !fs.existsSync(path.join(PUBLIC_DIR, pkg.imagePath))
    if (imageMissing && next.status !== "draft") {
      next.status = "draft"
      changes.push(`${label}: status -> draft (missing ${pkg.imagePath})`)
    }

    if (!next.imageAlt) next.imageAlt = `${pkg.title} package poster`

    return next
  })
}

console.log(`${changes.length} change(s)${APPLY ? "" : " (dry run — pass --apply to write)"}\n`)
for (const change of changes.slice(0, 40)) console.log("  " + change)
if (changes.length > 40) console.log(`  … and ${changes.length - 40} more`)

const drafted = ["local", "international"].flatMap((c) =>
  catalog[c].filter((p) => p.status === "draft")
)
const published = ["local", "international"].flatMap((c) =>
  catalog[c].filter((p) => p.status !== "draft")
)
console.log(`\nResult: ${published.length} published, ${drafted.length} drafted`)

if (APPLY) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf8")
  console.log(`\nWrote ${JSON_PATH}`)
}
