export type InquiryStatus = "new" | "read" | "responded" | "archived"

export type InquirySource = "contact-form" | "package-cta"

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
}

export type InquiryRepository = {
  listInquiries(): Promise<InquiryRecord[]>
  createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord>
  updateInquiry(id: string, updates: UpdateInquiryPayload): Promise<InquiryRecord | null>
  deleteInquiry(id: string): Promise<InquiryRecord | null>
}

export const INQUIRY_STATUSES: InquiryStatus[] = ["new", "read", "responded", "archived"]

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
