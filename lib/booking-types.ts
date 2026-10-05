export type BookingStatus = "held" | "confirmed" | "completed" | "cancelled"
export type BookingPaymentStatus = "unpaid" | "deposit-paid" | "paid" | "refunded"
export type BookingPaymentKind = "payment" | "refund"
export type BookingPaymentMethod = "cash" | "bank-transfer" | "e-wallet" | "card" | "other"

export const BOOKING_STATUSES: BookingStatus[] = ["held", "confirmed", "completed", "cancelled"]
export const BOOKING_PAYMENT_STATUSES: BookingPaymentStatus[] = [
  "unpaid",
  "deposit-paid",
  "paid",
  "refunded"
]
export const BOOKING_PAYMENT_KINDS: BookingPaymentKind[] = ["payment", "refund"]
export const BOOKING_PAYMENT_METHODS: BookingPaymentMethod[] = [
  "cash",
  "bank-transfer",
  "e-wallet",
  "card",
  "other"
]

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as string[]).includes(value)
}

export function isBookingPaymentStatus(value: unknown): value is BookingPaymentStatus {
  return typeof value === "string" && (BOOKING_PAYMENT_STATUSES as string[]).includes(value)
}

export function isBookingPaymentKind(value: unknown): value is BookingPaymentKind {
  return typeof value === "string" && (BOOKING_PAYMENT_KINDS as string[]).includes(value)
}

export function isBookingPaymentMethod(value: unknown): value is BookingPaymentMethod {
  return typeof value === "string" && (BOOKING_PAYMENT_METHODS as string[]).includes(value)
}

export type BookingPaymentEntry = {
  id: string
  kind: BookingPaymentKind
  amount: number
  currency: string
  occurredAt: string
  method: BookingPaymentMethod
  reference?: string
  note?: string
  recordedAt: string
}

type BookingBase = {
  id: string
  inquiryId: string
  guestName: string
  guestEmail: string
  guestMobile: string
  total: number
  currency: string
  status: BookingStatus
  paymentStatus: BookingPaymentStatus
  payments?: BookingPaymentEntry[]
  holdExpiresAt?: string
  quoteNote?: string
  cancelledAt?: string
  cancellationReason?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/** `productType` is optional only for condo records created before the dashboard. */
export type StayBookingRecord = BookingBase & {
  productType?: "stay"
  stayId: string
  stayTitle: string
  staySlug: string
  guestCount?: number
  /** Legacy alias kept because existing records already use it. */
  guests?: number
  checkIn: string
  checkOut: string
  nights: number
  nightlyRate: number
  cleaningFee: number
  accommodation: number
}

export type PackageBookingRecord = BookingBase & {
  productType: "package"
  packageId: string
  packageTitle: string
  packageSlug: string
  packageCategory: "local" | "international"
  /** The travel period the guest picked, when the inquiry came through one. */
  departureId?: string
  travelDateFrom: string
  travelDateTo: string
  adults: number
  children: number
}

export type BookingRecord = StayBookingRecord | PackageBookingRecord

export function getBookingProductType(booking: BookingRecord): "stay" | "package" {
  return booking.productType === "package" ? "package" : "stay"
}

export function getBookingTitle(booking: BookingRecord) {
  return getBookingProductType(booking) === "package"
    ? (booking as PackageBookingRecord).packageTitle
    : (booking as StayBookingRecord).stayTitle
}

export function getBookingStartDate(booking: BookingRecord) {
  return getBookingProductType(booking) === "package"
    ? (booking as PackageBookingRecord).travelDateFrom
    : (booking as StayBookingRecord).checkIn
}

export function getBookingEndDate(booking: BookingRecord) {
  return getBookingProductType(booking) === "package"
    ? (booking as PackageBookingRecord).travelDateTo
    : (booking as StayBookingRecord).checkOut
}

export function getBookingPayments(booking: BookingRecord): BookingPaymentEntry[] {
  return Array.isArray(booking.payments) ? booking.payments : []
}

export function bookingPaymentTotals(booking: BookingRecord) {
  let paid = 0
  let refunded = 0
  for (const entry of getBookingPayments(booking)) {
    if (entry.kind === "payment") paid += entry.amount
    else refunded += entry.amount
  }
  const netPaid = paid - refunded
  return { paid, refunded, netPaid, balance: Math.max(booking.total - netPaid, 0) }
}

export function deriveBookingPaymentStatus(booking: BookingRecord): BookingPaymentStatus {
  const { paid, refunded, netPaid } = bookingPaymentTotals(booking)
  if (paid > 0 && refunded >= paid) return "refunded"
  if (netPaid <= 0) return "unpaid"
  if (netPaid < booking.total) return "deposit-paid"
  return "paid"
}

export function isBookingPaymentEntry(value: unknown): value is BookingPaymentEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === "string" &&
    isBookingPaymentKind(entry.kind) &&
    typeof entry.amount === "number" &&
    Number.isFinite(entry.amount) &&
    entry.amount > 0 &&
    typeof entry.currency === "string" &&
    typeof entry.occurredAt === "string" &&
    isBookingPaymentMethod(entry.method) &&
    typeof entry.recordedAt === "string"
  )
}

export function isBookingRecord(value: unknown): value is BookingRecord {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  const common =
    typeof record.id === "string" &&
    typeof record.inquiryId === "string" &&
    typeof record.guestName === "string" &&
    typeof record.guestEmail === "string" &&
    typeof record.total === "number" &&
    typeof record.currency === "string" &&
    isBookingStatus(record.status) &&
    isBookingPaymentStatus(record.paymentStatus) &&
    (record.payments === undefined ||
      (Array.isArray(record.payments) && record.payments.every(isBookingPaymentEntry))) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  if (!common) return false

  if (record.productType === "package") {
    return (
      typeof record.packageId === "string" &&
      typeof record.packageTitle === "string" &&
      typeof record.travelDateFrom === "string" &&
      typeof record.travelDateTo === "string"
    )
  }

  return (
    typeof record.stayId === "string" &&
    typeof record.stayTitle === "string" &&
    typeof record.checkIn === "string" &&
    typeof record.checkOut === "string" &&
    typeof record.nights === "number"
  )
}
