/**
 * Airlines a package can fly, and how to recognise them on a poster.
 *
 * A package stores `airlines` as a list of entries. An airline on the list
 * below is stored by its two-letter IATA code ("5J"), which is what its logo is
 * fetched by; one that isn't is stored by its name as typed, and shows as a
 * text badge. Free of React and Node so the admin, the storefront, the poster
 * reader and the tests share one copy.
 */

export type Airline = {
  /** IATA code: what flight numbers start with, and what the logo is looked up by. */
  code: string
  name: string
  /** Other names an admin might type or a poster might print, matched in any case. */
  aliases?: string[]
  /**
   * Abbreviations that are also ordinary words or names ("PAL", "ANA"), so
   * they only count in capitals, as a whole word.
   */
  initials?: string[]
  /**
   * When the name itself turns up in ordinary text ("United Arab Emirates"),
   * the phrases that do mean the airline, used in its place for reading text.
   */
  textMatches?: string[]
}

/** Airlines flying the routes these packages sell, from Manila, Cebu and Clark. */
export const AIRLINES: Airline[] = [
  { code: "PR", name: "Philippine Airlines", initials: ["PAL"] },
  { code: "5J", name: "Cebu Pacific", aliases: ["Cebu Pacific Air"] },
  { code: "DG", name: "Cebgo" },
  { code: "Z2", name: "Philippines AirAsia", aliases: ["AirAsia Philippines", "AirAsia", "Air Asia"] },
  { code: "KE", name: "Korean Air" },
  { code: "OZ", name: "Asiana Airlines", aliases: ["Asiana"] },
  { code: "7C", name: "Jeju Air" },
  { code: "LJ", name: "Jin Air" },
  { code: "TW", name: "T'way Air", aliases: ["T'way", "T’way", "T’way Air", "Tway", "Tway Air"] },
  { code: "BX", name: "Air Busan" },
  { code: "RS", name: "Air Seoul" },
  { code: "JL", name: "Japan Airlines", initials: ["JAL"] },
  { code: "NH", name: "ANA", aliases: ["All Nippon Airways"], initials: ["ANA"], textMatches: ["All Nippon Airways"] },
  { code: "CX", name: "Cathay Pacific", aliases: ["Cathay"] },
  { code: "UO", name: "HK Express", aliases: ["Hong Kong Express"] },
  { code: "HX", name: "Hong Kong Airlines" },
  { code: "NX", name: "Air Macau" },
  { code: "BR", name: "EVA Air", initials: ["EVA"] },
  { code: "CI", name: "China Airlines" },
  { code: "JX", name: "Starlux Airlines", aliases: ["Starlux"] },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "TR", name: "Scoot" },
  { code: "TG", name: "Thai Airways" },
  { code: "FD", name: "Thai AirAsia" },
  { code: "VN", name: "Vietnam Airlines" },
  { code: "VJ", name: "VietJet Air", aliases: ["VietJet", "Vietjet Air"] },
  { code: "MH", name: "Malaysia Airlines" },
  { code: "3K", name: "Jetstar Asia", aliases: ["Jetstar"] },
  { code: "BI", name: "Royal Brunei Airlines", aliases: ["Royal Brunei"] },
  { code: "GA", name: "Garuda Indonesia", aliases: ["Garuda"] },
  { code: "MU", name: "China Eastern Airlines", aliases: ["China Eastern"] },
  { code: "CZ", name: "China Southern Airlines", aliases: ["China Southern"] },
  { code: "CA", name: "Air China" },
  { code: "MF", name: "Xiamen Airlines", aliases: ["Xiamen Air"] },
  {
    code: "EK",
    name: "Emirates",
    aliases: ["Emirates Airline"],
    textMatches: ["Emirates Airline", "Emirates Airlines", "Fly Emirates"]
  },
  { code: "QR", name: "Qatar Airways" },
  { code: "EY", name: "Etihad Airways", aliases: ["Etihad"] },
  { code: "TK", name: "Turkish Airlines" }
]

/** Fired on the package form by the poster reader with the airlines it found, as names or codes. */
export const POSTER_AIRLINES_EVENT = "poster:airlines"

export const MAX_AIRLINES = 4
const MAX_ENTRY_LENGTH = 60

const BY_CODE = new Map(AIRLINES.map((airline) => [airline.code, airline]))

/** Lower case, curly quotes straightened, punctuation and runs of space dropped. */
function comparable(text: string) {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim()
}

const BY_NAME = new Map<string, Airline>()
for (const airline of AIRLINES) {
  for (const name of [airline.name, ...(airline.aliases ?? []), ...(airline.initials ?? [])]) {
    BY_NAME.set(comparable(name), airline)
  }
}

export type ResolvedAirline = { code?: string; name: string }

/** A stored entry, a typed name or a code, as the airline it means. */
export function resolveAirline(entry: string): ResolvedAirline {
  const trimmed = entry.trim().replace(/\s+/g, " ")
  const listed = BY_CODE.get(trimmed.toUpperCase()) ?? BY_NAME.get(comparable(trimmed))
  return listed ? { code: listed.code, name: listed.name } : { name: trimmed }
}

/**
 * Cleans a list of airlines for storing: listed airlines become their code,
 * however they were written, so "Cebu Pacific" and "5J" are one airline and
 * not two; others keep their name. Blank, overlong and repeated entries go.
 */
export function normalizeAirlines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of raw) {
    if (typeof value !== "string") continue
    const trimmed = value.trim().replace(/\s+/g, " ")
    if (!trimmed || trimmed.length > MAX_ENTRY_LENGTH) continue
    const resolved = resolveAirline(trimmed)
    const entry = resolved.code ?? resolved.name
    const key = entry.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry)
    if (out.length === MAX_AIRLINES) break
  }
  return out
}

export function resolveAirlines(entries: readonly string[] | undefined): ResolvedAirline[] {
  return (entries ?? []).map(resolveAirline)
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type Pattern = { airline: Airline; pattern: RegExp; length: number }

/*
  Each pattern captures the character before the phrase rather than using a
  lookbehind, which Safari before 16.4 cannot parse — and this module loads on
  the public package pages.

  Longest phrase first, and each match blanked out once found, so "Thai
  AirAsia" is not also read as "AirAsia". Plain words like "Thai" and the
  airport code "CEB" are deliberately not names here: "Thai massage" and
  "MNL–CEB" are not airlines.
*/
const TEXT_PATTERNS: Pattern[] = AIRLINES.flatMap((airline) => {
  const phrases = airline.textMatches ?? [airline.name, ...(airline.aliases ?? [])]
  const named = phrases
    .filter((phrase) => !(airline.initials ?? []).includes(phrase))
    .map((phrase) => ({
      airline,
      pattern: new RegExp(`(^|[^\\w'’])${escapeRegExp(phrase).replace(/'/g, "['’]?")}(?![\\w'’])`, "gi"),
      length: phrase.length
    }))
  const initials = (airline.initials ?? []).map((initial) => ({
    airline,
    pattern: new RegExp(`(^|\\W)${escapeRegExp(initial)}(?!\\w)`, "g"),
    length: initial.length
  }))
  return [...named, ...initials]
}).sort((a, b) => b.length - a.length)

/** "5J 188", "7C2104", "PR 412": a listed code, then the flight's number. */
const FLIGHT_NUMBER = /\b([A-Z0-9]{2})\s?\d{2,4}\b/g

/**
 * The listed airlines a piece of text mentions, by name or by flight number,
 * as codes in the order they first appear. For a poster's transcription, and
 * for suggesting an airline on packages saved before there was a field for it.
 */
export function findAirlinesInText(text: string): string[] {
  const found: { code: string; index: number }[] = []
  let remaining = text

  for (const { airline, pattern } of TEXT_PATTERNS) {
    remaining = remaining.replace(pattern, (match: string, before: string, offset: number) => {
      found.push({ code: airline.code, index: offset + before.length })
      return before + " ".repeat(match.length - before.length)
    })
  }

  const flightNumber = new RegExp(FLIGHT_NUMBER.source, "g")
  for (let match = flightNumber.exec(remaining); match; match = flightNumber.exec(remaining)) {
    const code = match[1]
    if (/[A-Z]/.test(code) && BY_CODE.has(code)) found.push({ code, index: match.index })
  }

  return Array.from(new Set(found.sort((a, b) => a.index - b.index).map((entry) => entry.code)))
}

/**
 * The airline's logo, by IATA code, from a public logo service. Asked for at
 * twice the size it is drawn so it stays sharp on high-density screens.
 */
export function airlineLogoUrl(code: string, width: number, height: number) {
  return `https://pics.avs.io/${width * 2}/${height * 2}/${encodeURIComponent(code)}.png`
}
