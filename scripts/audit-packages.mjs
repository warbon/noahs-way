/**
 * Read-only catalog health check. Never writes.
 * Exits non-zero when it finds problems, so it can gate a release.
 *
 *   node scripts/audit-packages.mjs
 */
import fs from "node:fs"
import path from "node:path"

const JSON_PATH = process.env.PACKAGE_JSON_PATH || path.join(process.cwd(), "data", "packages.json")
const PUBLIC_DIR = path.join(process.cwd(), "public")

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "package"
}

function parsePriceAmount(price) {
  if (!price) return undefined
  const match = String(price).replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : undefined
}

/** Destinations that clearly contradict the category they're filed under. */
const INTERNATIONAL_HINTS = [
  "seoul", "korea", "japan", "tokyo", "kyoto", "singapore", "dubai", "bangkok",
  "hong kong", "bali", "taipei", "istanbul", "paris", "swiss", "sydney", "new york"
]

const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"))
const allRecords = [
  ...(raw.local ?? []).map((p) => ({ ...p, category: "local" })),
  ...(raw.international ?? []).map((p) => ({ ...p, category: "international" }))
]

// Drafts are deliberately withheld from the storefront, so their gaps are not
// release blockers. Only what customers can actually reach is audited.
const records = allRecords.filter((p) => p.status !== "draft")
const draftCount = allRecords.length - records.length

const findings = []
const imageUsage = new Map()
const slugUsage = new Map()

for (const pkg of records) {
  const label = `${pkg.category}/${pkg.title}`

  if (pkg.imagePath?.startsWith("/")) {
    const onDisk = path.join(PUBLIC_DIR, pkg.imagePath)
    if (!fs.existsSync(onDisk)) {
      findings.push({ level: "error", label, issue: `missing image ${pkg.imagePath}` })
    }
    const users = imageUsage.get(pkg.imagePath) ?? []
    users.push(label)
    imageUsage.set(pkg.imagePath, users)
  }

  if (parsePriceAmount(pkg.price) === undefined) {
    findings.push({ level: "error", label, issue: `unparseable price "${pkg.price}"` })
  }

  const slug = pkg.slug || slugify(pkg.title)
  const slugKey = `${pkg.category}/${slug}`
  const slugUsers = slugUsage.get(slugKey) ?? []
  slugUsers.push(label)
  slugUsage.set(slugKey, slugUsers)

  if (pkg.category === "local") {
    const haystack = `${pkg.title} ${pkg.details ?? ""}`.toLowerCase()
    const hit = INTERNATIONAL_HINTS.find((word) => haystack.includes(word))
    if (hit) {
      findings.push({
        level: "warn",
        label,
        issue: `filed as local but mentions "${hit}" — likely wrong category`
      })
    }
  }

  if (!pkg.itinerary?.length && !pkg.inclusions?.length) {
    findings.push({ level: "warn", label, issue: "no structured itinerary or inclusions" })
  }
}

for (const [image, users] of imageUsage) {
  if (users.length > 1) {
    findings.push({
      level: "warn",
      label: image.split("/").pop(),
      issue: `same poster reused by ${users.length} packages: ${users.join(", ")}`
    })
  }
}

for (const [slug, users] of slugUsage) {
  if (users.length > 1) {
    findings.push({ level: "error", label: slug, issue: `slug collision: ${users.join(", ")}` })
  }
}

const errors = findings.filter((f) => f.level === "error")
const warnings = findings.filter((f) => f.level === "warn")

console.log(
  `Audited ${records.length} published package(s) from ${JSON_PATH}` +
    (draftCount ? ` (${draftCount} draft(s) skipped)` : "") +
    "\n"
)
for (const f of errors) console.log(`  ERROR  ${f.label}: ${f.issue}`)
for (const f of warnings) console.log(`  warn   ${f.label}: ${f.issue}`)
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`)

process.exit(errors.length > 0 ? 1 : 0)
