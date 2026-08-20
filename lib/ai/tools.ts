import {
  findCatalogEntry,
  loadPublishedCatalog,
  matchesQuery,
  toModelPackage
} from "@/lib/ai/catalog"
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
  message: { type: "string", description: "Anything else the consultant should know." }
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

export const AGENT_TOOLS: AgentToolDefinition[] = [...dataTools, ...genUiTools]

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
    default:
      return { error: `Unknown tool "${name}".` }
  }
}
