import {
  findCatalogEntry,
  loadPublishedCatalog,
  matchesQuery,
  toModelPackage
} from "@/lib/ai/catalog"
import {
  findStayEntry,
  loadPublishedStays,
  matchesStayQuery,
  toModelStay
} from "@/lib/ai/stay-catalog"
import { checkStayRange, quoteStay, todayInManila } from "@/lib/stay-availability"
import { GEN_UI_TOOL_NAMES, type GenUiToolName } from "@/lib/ai/genui-types"
import type { AgentToolDefinition } from "@/lib/ai/provider-types"
import { TRAVEL_TYPES } from "@/lib/inquiry-types"
import { formatDuration, formatPackagePrice } from "@/lib/price"

/** Keeps a single tool result from swallowing the context window. */
const MAX_SEARCH_RESULTS = 6

const dataTools: AgentToolDefinition[] = [
  {
    name: "search_packages",
    description:
      "Search the published Noah's Way package catalog. Use this before recommending anything — it is the only source of real titles, prices and durations. Returns at most 6 matches.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text terms such as a destination or theme, e.g. 'korea' or 'island hopping'. All terms must match."
        },
        category: {
          type: "string",
          enum: ["local", "international"],
          description: "'local' is within the Philippines, 'international' is overseas."
        },
        maxPriceAmount: {
          type: "number",
          description: "Upper bound on the per-person starting price, in PHP."
        },
        minDurationDays: { type: "number", description: "Shortest acceptable trip length in days." },
        maxDurationDays: { type: "number", description: "Longest acceptable trip length in days." }
      },
      additionalProperties: false
    }
  },
  {
    name: "get_package_details",
    description:
      "Fetch the full itinerary, inclusions and exclusions for one package, using a packageId returned by search_packages.",
    parameters: {
      type: "object",
      properties: {
        packageId: { type: "string", description: "The packageId from search_packages." }
      },
      required: ["packageId"],
      additionalProperties: false
    }
  }
]

/**
 * Condo stays.
 *
 * Kept as their own tools rather than widening the package ones: a unit has a
 * nightly rate and a calendar, a package has a departure window and an
 * itinerary, and a single tool covering both would have to describe in prose
 * which of its fields apply — which is exactly the kind of ambiguity a model
 * resolves by guessing.
 */
const stayTools: AgentToolDefinition[] = [
  {
    name: "search_stays",
    description:
      "Search the published condo units available for short stays. Use this before mentioning any unit — it is the only source of real titles, rates and capacities. Condo stays are nightly rentals, separate from the tour packages.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free-text terms such as a city, building or amenity, e.g. 'cebu studio' or 'pool'. All terms must match."
        },
        minGuests: {
          type: "number",
          description: "Only return units that sleep at least this many guests."
        },
        maxNightlyRate: { type: "number", description: "Upper bound on the nightly rate, in PHP." }
      },
      additionalProperties: false
    }
  },
  {
    name: "check_stay_availability",
    description:
      "Check whether one unit's calendar currently shows a date range as free, and what those nights would cost. ALWAYS use this instead of reasoning about dates yourself. The answer reflects the owner's last calendar update and is never a confirmed hold — say so when you report it.",
    parameters: {
      type: "object",
      properties: {
        stayId: { type: "string", description: "The stayId from search_stays." },
        checkIn: { type: "string", description: "First night, as YYYY-MM-DD." },
        checkOut: {
          type: "string",
          description: "Departure morning, as YYYY-MM-DD. This night is not charged."
        },
        guests: { type: "number", description: "How many people will stay." }
      },
      required: ["stayId", "checkIn", "checkOut"],
      additionalProperties: false
    }
  }
]

const bookingDraftProperties = {
  name: { type: "string", description: "Full name of the person travelling." },
  mobile: { type: "string", description: "Mobile number, e.g. +63 917 000 0000." },
  email: { type: "string", description: "Email address." },
  packageId: { type: "string", description: "packageId from search_packages, if one was chosen." },
  destination: {
    type: "string",
    description:
      "The place they are travelling to, e.g. 'Cebu and Bohol' or 'Seoul'. Fill this in even when a package was chosen — the consultant's inbox shows it as its own field, and a package title is not a destination."
  },
  airportOfOrigin: { type: "string", description: "Departure airport or city." },
  travelDateFrom: { type: "string", description: "Departure date as YYYY-MM-DD." },
  travelDateTo: { type: "string", description: "Return date as YYYY-MM-DD." },
  flexibleOnPromoDates: {
    type: "boolean",
    description: "True if they would shift dates to catch a promo fare."
  },
  adults: { type: "number", description: "Number of adults." },
  children: { type: "number", description: "Number of children." },
  childAges: { type: "string", description: "Free text, e.g. '5, 8 and 11'." },
  travelType: { type: "string", enum: [...TRAVEL_TYPES] },
  message: { type: "string", description: "Anything else the consultant should know." },
  stayId: {
    type: "string",
    description:
      "stayId from search_stays, when the request is for a condo unit rather than a tour package. Never set both this and packageId."
  },
  checkIn: { type: "string", description: "For a condo stay: first night, as YYYY-MM-DD." },
  checkOut: {
    type: "string",
    description: "For a condo stay: departure morning, as YYYY-MM-DD."
  },
  guests: { type: "number", description: "For a condo stay: how many people will stay." }
} as const

const genUiTools: AgentToolDefinition[] = [
  {
    name: "show_package_picker",
    description:
      "Render selectable package cards. Pass packageIds from search_packages; the cards are built from the catalog, so never describe prices in `intro` — the cards carry them.",
    parameters: {
      type: "object",
      properties: {
        intro: { type: "string", description: "One short line above the cards." },
        packageIds: {
          type: "array",
          items: { type: "string" },
          description: "Between 1 and 4 packageIds from search_packages."
        }
      },
      required: ["intro", "packageIds"],
      additionalProperties: false
    }
  },
  {
    name: "show_stay_picker",
    description:
      "Render selectable condo cards. Pass stayIds from search_stays; the cards are built from the catalog, so never describe rates in `intro` — the cards carry them.",
    parameters: {
      type: "object",
      properties: {
        intro: { type: "string", description: "One short line above the cards." },
        stayIds: {
          type: "array",
          items: { type: "string" },
          description: "Between 1 and 4 stayIds from search_stays."
        }
      },
      required: ["intro", "stayIds"],
      additionalProperties: false
    }
  },
  {
    name: "show_stay_date_picker",
    description:
      "Render a check-in/check-out calendar for one unit, with nights already booked greyed out and a running total. Use this instead of asking for stay dates in prose, and instead of quoting a total yourself.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "One short line of context." },
        stayId: { type: "string", description: "The stayId from search_stays." }
      },
      required: ["prompt", "stayId"],
      additionalProperties: false
    }
  },
  {
    name: "show_travel_date_picker",
    description:
      "Render a departure/return date picker with a 'flexible for promo fares' option. Use this instead of asking for dates in prose.",
    parameters: {
      type: "object",
      properties: { prompt: { type: "string", description: "One short line of context." } },
      required: ["prompt"],
      additionalProperties: false
    }
  },
  {
    name: "show_traveller_selector",
    description:
      "Render adult/child counters and a field for children's ages. Use this instead of asking for headcount in prose.",
    parameters: {
      type: "object",
      properties: { prompt: { type: "string", description: "One short line of context." } },
      required: ["prompt"],
      additionalProperties: false
    }
  },
  {
    name: "show_contact_form",
    description:
      "Render name, mobile and email fields. Call this once you know what they want to book — a consultant cannot follow up without all three.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "One short line of context." },
        prefill: {
          type: "object",
          properties: {
            name: { type: "string" },
            mobile: { type: "string" },
            email: { type: "string" }
          },
          description: "Only values the visitor already gave you. Never invent these.",
          additionalProperties: false
        }
      },
      required: ["prompt"],
      additionalProperties: false
    }
  },
  {
    name: "show_booking_summary",
    description:
      "Render a final recap with a Confirm button. This is the last step: you cannot submit a booking yourself, only the visitor's click does that. Only call it once name, mobile and email are known.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "One short line above the recap." },
        ...bookingDraftProperties
      },
      required: ["prompt", "name", "mobile", "email"],
      additionalProperties: false
    }
  },
  {
    name: "show_quick_replies",
    description:
      "Offer 2-4 tappable options when a question has a small set of sensible answers.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The question being asked." },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Between 2 and 4 short answers."
        }
      },
      required: ["prompt", "options"],
      additionalProperties: false
    }
  }
]

export const AGENT_TOOLS: AgentToolDefinition[] = [...dataTools, ...stayTools, ...genUiTools]

export function isGenUiTool(name: string): name is GenUiToolName {
  return (GEN_UI_TOOL_NAMES as string[]).includes(name)
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : undefined
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

async function runSearchPackages(input: Record<string, unknown>) {
  const query = readString(input.query)
  const category = input.category === "local" || input.category === "international"
    ? input.category
    : undefined
  const maxPrice = readNumber(input.maxPriceAmount)
  const minDays = readNumber(input.minDurationDays)
  const maxDays = readNumber(input.maxDurationDays)

  const catalog = await loadPublishedCatalog()

  const matches = catalog
    .filter((entry) => (category ? entry.category === category : true))
    .filter((entry) => (query ? matchesQuery(entry, query) : true))
    .filter((entry) =>
      maxPrice === undefined || entry.priceAmount === undefined
        ? true
        : entry.priceAmount <= maxPrice
    )
    .filter((entry) => {
      const days = entry.durationDays
      if (days === undefined) return true
      if (minDays !== undefined && days < minDays) return false
      if (maxDays !== undefined && days > maxDays) return false
      return true
    })

  return {
    matchCount: matches.length,
    results: matches.slice(0, MAX_SEARCH_RESULTS).map(toModelPackage),
    truncated: matches.length > MAX_SEARCH_RESULTS
  }
}

async function runGetPackageDetails(input: Record<string, unknown>) {
  const packageId = readString(input.packageId)
  if (!packageId) return { error: "packageId is required." }

  const entry = await findCatalogEntry(packageId)
  if (!entry) {
    return { error: "No published package has that id. Call search_packages again." }
  }

  return {
    ...toModelPackage(entry),
    duration: formatDuration(entry.durationDays, entry.durationNights),
    priceLabel: formatPackagePrice(entry),
    highlights: entry.highlights,
    itinerary: entry.itinerary,
    inclusions: entry.inclusions,
    exclusions: entry.exclusions
  }
}

async function runSearchStays(input: Record<string, unknown>) {
  const query = readString(input.query)
  const minGuests = readNumber(input.minGuests)
  const maxRate = readNumber(input.maxNightlyRate)

  const stays = await loadPublishedStays()

  const matches = stays
    .filter((entry) => (query ? matchesStayQuery(entry, query) : true))
    .filter((entry) => (minGuests === undefined ? true : entry.maxGuests >= minGuests))
    .filter((entry) => (maxRate === undefined ? true : entry.nightlyRate <= maxRate))

  return {
    matchCount: matches.length,
    results: matches.slice(0, MAX_SEARCH_RESULTS).map(toModelStay),
    truncated: matches.length > MAX_SEARCH_RESULTS
  }
}

/**
 * Answers availability by computing it, never by handing the model a list of
 * blocked ranges to reason over.
 *
 * The `note` is part of the contract rather than decoration. The calendar is
 * the owner's last save, not a live ledger, and an assistant that reports
 * "those nights are free" without that caveat is making a promise the business
 * has not made.
 */
async function runCheckStayAvailability(input: Record<string, unknown>) {
  const stayId = readString(input.stayId)
  if (!stayId) return { error: "stayId is required." }

  const entry = await findStayEntry(stayId)
  if (!entry) {
    return { error: "No published unit has that id. Call search_stays again." }
  }

  const checkIn = readString(input.checkIn)
  const checkOut = readString(input.checkOut)
  const guests = readNumber(input.guests)

  const range = checkStayRange(checkIn, checkOut, entry)

  if (!range.ok) {
    return {
      stayId: entry.id,
      title: entry.title,
      available: false,
      reason: range.error,
      minimumNights: entry.minimumNights ?? 1,
      maxGuests: entry.maxGuests,
      today: todayInManila()
    }
  }

  if (guests !== undefined && guests > entry.maxGuests) {
    return {
      stayId: entry.id,
      title: entry.title,
      available: false,
      reason: `This unit sleeps up to ${entry.maxGuests}.`,
      maxGuests: entry.maxGuests
    }
  }

  const quote = quoteStay(entry, range.nights)

  return {
    stayId: entry.id,
    title: entry.title,
    available: true,
    checkIn,
    checkOut,
    nights: quote.nights,
    nightlyRate: quote.nightlyRate,
    accommodation: quote.accommodation,
    cleaningFee: quote.cleaningFee,
    estimatedTotal: quote.total,
    currency: quote.currency,
    availabilityUpdatedAt: entry.availabilityUpdatedAt?.slice(0, 10),
    note: "Reflects the owner's last calendar update. This is NOT a confirmed hold — a consultant checks the unit is still free before anything is reserved. Say this when you report the result."
  }
}

/**
 * Runs a data tool. GenUI tools are not handled here — the chat route renders
 * those and acknowledges them, because their "result" is the visitor's answer.
 */
export async function runDataTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "search_packages":
      return runSearchPackages(input)
    case "get_package_details":
      return runGetPackageDetails(input)
    case "search_stays":
      return runSearchStays(input)
    case "check_stay_availability":
      return runCheckStayAvailability(input)
    default:
      return { error: `Unknown tool "${name}".` }
  }
}
