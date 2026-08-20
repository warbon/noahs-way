import type { PackageCategory } from "@/lib/package-data"
import type { TravelType } from "@/lib/inquiry-types"

/**
 * Generative UI contract.
 *
 * Each entry pairs a tool the assistant can call with the props its component
 * receives. Tool JSON Schemas (`lib/ai/tools.ts`) and React props
 * (`components/chat/genui/`) both derive from this file so a widget and its
 * tool cannot drift apart.
 *
 * Note the split between a widget's *tool input* (what the model writes) and
 * its *render payload* (what the client receives). For the package picker the
 * model only chooses ids; the server resolves them against the catalog, so a
 * card can never show a price or title the model invented.
 */

/** Trusted, server-resolved package fields. Never assembled by the model. */
export type ChatPackageSummary = {
  id: string
  title: string
  category: PackageCategory
  slug: string
  href: string
  destination?: string
  summary?: string
  priceLabel: string
  durationLabel?: string
  previewImage: string
  imageAlt: string
}

export type PackagePickerPayload = {
  intro: string
  packages: ChatPackageSummary[]
}

export type TravelDatePickerPayload = {
  prompt: string
}

export type TravellerSelectorPayload = {
  prompt: string
}

export type ContactFormPayload = {
  prompt: string
  prefill?: {
    name?: string
    mobile?: string
    email?: string
  }
}

export type QuickRepliesPayload = {
  prompt: string
  options: string[]
}

/**
 * The booking a visitor is about to confirm. Field names match
 * `CreateInquiryPayload` so `lib/inquiry-submission.ts` can validate it with
 * the same code path as the classic contact form.
 */
export type ChatBookingDraft = {
  name: string
  mobile: string
  email: string
  destination?: string
  airportOfOrigin?: string
  travelDateFrom?: string
  travelDateTo?: string
  flexibleOnPromoDates?: boolean
  adults?: number
  children?: number
  childAges?: string
  travelType?: TravelType
  message?: string
  packageId?: string
}

export type BookingSummaryPayload = {
  prompt: string
  draft: ChatBookingDraft
  /** Server-resolved from `draft.packageId`, so the recap can't misname it. */
  packageTitle?: string
}

export type GenUiPayloadMap = {
  show_package_picker: PackagePickerPayload
  show_travel_date_picker: TravelDatePickerPayload
  show_traveller_selector: TravellerSelectorPayload
  show_contact_form: ContactFormPayload
  show_booking_summary: BookingSummaryPayload
  show_quick_replies: QuickRepliesPayload
}

export type GenUiToolName = keyof GenUiPayloadMap

export const GEN_UI_TOOL_NAMES: GenUiToolName[] = [
  "show_package_picker",
  "show_travel_date_picker",
  "show_traveller_selector",
  "show_contact_form",
  "show_booking_summary",
  "show_quick_replies"
]

export function isGenUiToolName(value: unknown): value is GenUiToolName {
  return typeof value === "string" && (GEN_UI_TOOL_NAMES as string[]).includes(value)
}

/** What a completed widget hands back. Posted to the chat route as a user turn. */
export type GenUiResultMap = {
  show_package_picker: { packageId: string; title: string }
  show_travel_date_picker: {
    travelDateFrom?: string
    travelDateTo?: string
    flexibleOnPromoDates: boolean
  }
  show_traveller_selector: { adults: number; children: number; childAges?: string }
  show_contact_form: { name: string; mobile: string; email: string }
  show_booking_summary: { confirmed: boolean; reference?: string }
  show_quick_replies: { choice: string }
}

export type GenUiWidget = {
  [K in GenUiToolName]: {
    /** The provider's tool-call id; also the React key and the answered-state key. */
    id: string
    name: K
    payload: GenUiPayloadMap[K]
  }
}[GenUiToolName]

/** Props every widget component receives from the registry. */
export type GenUiComponentProps<K extends GenUiToolName = GenUiToolName> = {
  widget: Extract<GenUiWidget, { name: K }>
  /** Already answered — render a read-only recap instead of live controls. */
  answered: boolean
  disabled: boolean
  onSubmit: (result: GenUiResultMap[K]) => void
}
