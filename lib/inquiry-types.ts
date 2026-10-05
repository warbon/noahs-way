export type InquiryStatus =
  | "new"
  | "read"
  | "responded"
  | "accepted"
  | "declined"
  | "archived"

export class InquiryHasBookingError extends Error {
  constructor() {
    super("An inquiry with an accepted booking cannot be changed this way")
    this.name = "InquiryHasBookingError"
  }
}

export type InquirySource = "contact-form" | "package-cta" | "chat-agent" | "stay-cta"

export type TravelType = "leisure" | "honeymoon" | "family" | "group" | "corporate"

export const TRAVEL_TYPES: TravelType[] = [
  "leisure",
  "honeymoon",
  "family",
  "group",
  "corporate"
]

export type InquiryRecord = {
  id: string

  // Contact — mobile and email are the two required channels.
  name: string
  mobile: string
  email: string

  // Booking details.
  destination?: string
  airportOfOrigin?: string
  travelDateFrom?: string
  travelDateTo?: string
  /** Willing to shift dates to catch a promo fare. */
  flexibleOnPromoDates?: boolean
  adults?: number
  children?: number
  /** Free text, because ages matter for pricing: "5, 8 and 11". */
  childAges?: string
  travelType?: TravelType

  /** Optional free-text notes; the structured fields carry the booking itself. */
  message?: string

  /**
   * Snapshotted server-side from the catalog when the inquiry came from a
   * package CTA — never trusted from the client.
   */
  packageId?: string
  packageTitle?: string
  packageSlug?: string
  packageCategory?: "local" | "international"
  /**
   * The travel period picked from the package, snapshotted server-side after
   * it was re-checked as open. When present, `travelDateFrom`/`travelDateTo`
   * are that period's dates, never ones the customer typed.
   */
  departureId?: string
  /** "Oct 26–31, 2026 (+₱3,000/pax)", as it stood when the request was sent. */
  departureLabel?: string
  departureSurchargePerPax?: number

  /**
   * Snapshotted server-side when the inquiry came from a condo stay, alongside
   * the dates that were actually available at the moment it was submitted.
   *
   * Parallel to the `package*` fields above rather than sharing one neutral
   * `subject*` shape with them. Merging the two would read better, but every
   * inquiry already stored carries the `package*` names, and renaming them
   * would either orphan that history or require a migration for a cosmetic
   * gain.
   */
  stayId?: string
  stayTitle?: string
  staySlug?: string
  /** `YYYY-MM-DD`, Philippine local time. Check-out is not a night stayed. */
  checkIn?: string
  checkOut?: string
  nights?: number
  guests?: number

  /** Set atomically when a condo inquiry becomes a held booking. */
  bookingId?: string
  bookingStatus?: "held" | "confirmed" | "completed" | "cancelled"
  acceptedAt?: string
  quotedNightlyRate?: number
  quotedCleaningFee?: number
  quotedTotal?: number
  quotedCurrency?: string

  status: InquiryStatus
  source: InquirySource
  /** Free-text note the admin adds while working the lead. */
  adminNote?: string
  createdAt: string
}

export type CreateInquiryPayload = Omit<
  InquiryRecord,
  "id" | "status" | "createdAt" | "adminNote"
>

export type UpdateInquiryPayload = {
  status?: InquiryStatus
  adminNote?: string
  bookingId?: string
  bookingStatus?: "held" | "confirmed" | "completed" | "cancelled"
  acceptedAt?: string
  quotedNightlyRate?: number
  quotedCleaningFee?: number
  quotedTotal?: number
  quotedCurrency?: string
}

export type InquiryRepository = {
  listInquiries(): Promise<InquiryRecord[]>
  getInquiryById(id: string): Promise<InquiryRecord | null>
  createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord>
  updateInquiry(id: string, updates: UpdateInquiryPayload): Promise<InquiryRecord | null>
  deleteInquiry(id: string): Promise<InquiryRecord | null>
}

export const INQUIRY_STATUSES: InquiryStatus[] = [
  "new",
  "read",
  "responded",
  "accepted",
  "declined",
  "archived"
]

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (INQUIRY_STATUSES as string[]).includes(value)
}

export function isTravelType(value: unknown): value is TravelType {
  return typeof value === "string" && (TRAVEL_TYPES as string[]).includes(value)
}

export function isInquiryRecord(value: unknown): value is InquiryRecord {
  if (!value || typeof value !== "object") return false

  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.mobile === "string" &&
    typeof record.email === "string" &&
    typeof record.createdAt === "string" &&
    isInquiryStatus(record.status)
  )
}
