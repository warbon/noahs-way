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

/** Trusted, server-resolved condo fields. Never assembled by the model. */
export type ChatStaySummary = {
  id: string
  title: string
  slug: string
  href: string
  city: string
  building?: string
  summary?: string
  /** e.g. "₱2,462 / night" — formatted server-side from the stored rate. */
  rateLabel: string
  /** e.g. "Studio · Sleeps 2". */
  layoutLabel: string
  previewImage: string
  imageAlt: string
}

export type StayPickerPayload = {
  intro: string
  stays: ChatStaySummary[]
}

/**
 * The nights a guest is asking about, once they have picked a unit.
 *
 * Separate from `show_travel_date_picker` because the two ask different
 * questions: a trip has a departure and a return, while a stay has a check-in
 * and a check-out, where the check-out day is not a night paid for. Reusing
 * the travel picker would have meant relabelling it and then explaining the
 * difference in prose every time.
 */
export type StayDatePickerPayload = {
  prompt: string
  stayId: string
  stayTitle: string
  nightlyRate: number
  currency: string
  cleaningFee?: number
  minimumNights: number
  maxGuests: number
  /** Blocked ranges, so the picker can grey out nights without a round trip. */
  blocks: { from: string; to: string }[]
  availabilityUpdatedAt?: string
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
  /**
   * Set instead of `packageId` when the request is for a condo unit. The
   * booking route hands the whole draft to `submitInquiry`, which re-checks
   * these dates against the calendar before storing anything — the assistant's
   * answer is never the one that counts.
   */
  stayId?: string
  checkIn?: string
  checkOut?: string
  guests?: number
}

export type BookingSummaryPayload = {
  prompt: string
  draft: ChatBookingDraft
  /** Server-resolved from `draft.packageId`, so the recap can't misname it. */
  packageTitle?: string
  /** Server-resolved from `draft.stayId`, for the same reason. */
  stayTitle?: string
}

export type GenUiPayloadMap = {
  show_package_picker: PackagePickerPayload
  show_stay_picker: StayPickerPayload
  show_stay_date_picker: StayDatePickerPayload
  show_travel_date_picker: TravelDatePickerPayload
  show_traveller_selector: TravellerSelectorPayload
  show_contact_form: ContactFormPayload
  show_booking_summary: BookingSummaryPayload
  show_quick_replies: QuickRepliesPayload
}

export type GenUiToolName = keyof GenUiPayloadMap

export const GEN_UI_TOOL_NAMES: GenUiToolName[] = [
  "show_package_picker",
  "show_stay_picker",
  "show_stay_date_picker",
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
  show_stay_picker: { stayId: string; title: string }
  show_stay_date_picker: {
    checkIn: string
    checkOut: string
    nights: number
    guests: number
  }
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
