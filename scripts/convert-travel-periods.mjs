/**
 * Converts every package's poster-text travel periods into bookable
 * departures — the admin's "Convert to bookable travel periods" button, for
 * the whole catalogue at once. Dry-run by default; pass --apply to write.
 *
 *   npm run convert:travel-periods                      # preview, data/packages.json
 *   npm run convert:travel-periods -- --apply           # write it
 *   npm run convert:travel-periods -- --kv              # preview the live KV catalogue
 *   npm run convert:travel-periods -- --kv --apply      # write it
 *   npm run convert:travel-periods -- --year=2027       # date the lists from 2027
 *
 * The poster text rarely has a year. Like the button, a line that prints one
 * keeps it; otherwise the list is dated from the year the package was last
 * edited (or --year), moving into the next year where it runs past December —
 * so read the preview, and check the weekdays look like the operator's
 * departure days before applying.
 *
 * The old strings are kept beside the new departures. The site stops showing
 * them as soon as departures exist, and keeping them means a site still
 * running the previous release goes on showing what it showed before. The
 * next save from the admin drops them.
 *
 * A package with any line that cannot be read is left alone and listed, so a
 * window is never silently lost: convert that one by hand in the admin.
 */
import fs from "node:fs/promises"
import path from "node:path"

import {
  createDepartureId,
  normalizeDepartures,
  parseLegacyTravelPeriods
} from "../lib/package-departures.ts"
import { todayInManila } from "../lib/stay-availability.ts"

const args = process.argv.slice(2)
const APPLY = args.includes("--apply")
const USE_KV = args.includes("--kv")
const yearArg = args.find((arg) => arg.startsWith("--year="))
const YEAR = yearArg ? Number.parseInt(yearArg.slice("--year=".length), 10) : undefined

if (yearArg && !(Number.isInteger(YEAR) && YEAR >= 2000 && YEAR <= 2100)) {
  console.error(`Not a year: ${yearArg}`)
  process.exit(1)
}

const JSON_PATH = process.env.PACKAGE_JSON_PATH || path.join(process.cwd(), "data", "packages.json")
const KV_KEY = process.env.PACKAGE_CATALOG_KV_KEY?.trim() || "packages:catalog"
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function weekday(date) {
  const [year, month, day] = date.split("-").map(Number)
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()]
}

async function loadKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error("KV_REST_API_URL and KV_REST_API_TOKEN are not set. Pull them with `vercel env pull .env.local`.")
    process.exit(1)
  }
  const { kv } = await import("@vercel/kv")
  return kv
}

async function readCatalog() {
  if (USE_KV) {
    const kv = await loadKv()
    const catalog = await kv.get(KV_KEY)
    if (!catalog || typeof catalog !== "object") {
      console.error(`Nothing stored at KV key "${KV_KEY}".`)
      process.exit(1)
    }
    return catalog
  }
  return JSON.parse(await fs.readFile(JSON_PATH, "utf8"))
}

async function writeCatalog(catalog) {
  if (USE_KV) {
    const kv = await loadKv()
    await kv.set(KV_KEY, catalog)
    return
  }
  await fs.writeFile(JSON_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
}

const today = todayInManila()
const catalog = await readCatalog()
let converted = 0
let upcomingTotal = 0
const skipped = []

console.log(`${USE_KV ? `KV "${KV_KEY}"` : JSON_PATH} — today in Manila is ${today}\n`)

for (const category of ["local", "international"]) {
  for (const pkg of Array.isArray(catalog[category]) ? catalog[category] : []) {
    if (!Array.isArray(pkg.travelPeriods) || pkg.travelPeriods.length === 0) continue
    if (Array.isArray(pkg.departures) && pkg.departures.length > 0) continue

    const reference = YEAR ? `${YEAR}-01-01` : (pkg.updatedAt ?? pkg.createdAt ?? today).slice(0, 10)
    const parsed = parseLegacyTravelPeriods(pkg.travelPeriods, reference)
    const unreadable = parsed.filter((entry) => !entry.result).map((entry) => entry.line)

    console.log(`${pkg.title} (${pkg.status ?? "published"}) — dated from ${reference.slice(0, 4)}`)
    for (const { line, result } of parsed) {
      if (!result) {
        console.log(`  ${line.padEnd(30)} could not be read`)
        continue
      }
      const surcharge = result.surchargePerPax ? `  +₱${result.surchargePerPax.toLocaleString("en-PH")}/pax` : ""
      const past = result.startDate < today ? "  (already departed)" : ""
      console.log(
        `  ${line.padEnd(30)} ${weekday(result.startDate)} ${result.startDate} → ${weekday(result.endDate)} ${result.endDate}${surcharge}${past}`
      )
    }

    if (unreadable.length > 0) {
      skipped.push(pkg.title)
      console.log("  → left alone: convert it by hand in the admin\n")
      continue
    }

    pkg.departures = normalizeDepartures(
      parsed.map(({ result }) => ({ ...result, id: createDepartureId() }))
    )
    const upcoming = pkg.departures.filter((departure) => departure.startDate >= today).length
    upcomingTotal += upcoming
    converted += 1
    console.log(`  → ${pkg.departures.length} departures, ${upcoming} still to come\n`)
  }
}

console.log(
  `${converted} package(s) converted, ${upcomingTotal} upcoming departure(s) bookable` +
    (skipped.length ? `; left alone: ${skipped.join(", ")}` : "")
)

if (converted === 0) {
  console.log("Nothing to write.")
} else if (APPLY) {
  await writeCatalog(catalog)
  console.log(`Written to ${USE_KV ? `KV "${KV_KEY}"` : JSON_PATH}.`)
} else {
  console.log("Dry run — nothing written. Check the dates above, then run again with --apply.")
}
