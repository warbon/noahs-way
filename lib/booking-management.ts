import { appendActivitySafely, createActivityId } from "@/lib/activity-repository"
import {
  bookingStoreMode,
  getBookingById,
  listBookings,
  createBooking,
  updateBooking
} from "@/lib/booking-repository"
import {
  bookingPaymentTotals,
  deriveBookingPaymentStatus,
  getBookingEndDate,
  getBookingPayments,
  getBookingProductType,
  getBookingTitle,
  isBookingPaymentKind,
  isBookingPaymentMethod,
  isBookingStatus,
  type BookingPaymentEntry,
  type BookingPaymentKind,
  type BookingPaymentMethod,
  type BookingRecord,
  type BookingStatus,
  type PackageBookingRecord,
  type StayBookingRecord
} from "@/lib/booking-types"
import { getInquiryById, updateInquiry } from "@/lib/inquiry-repository"
import { notifyBookingUpdate } from "@/lib/booking-notifier"
import { getAllPackagesForAdmin } from "@/lib/package-repository"
import { derivePackageSlug } from "@/lib/package-slug"
import { getRedis } from "@/lib/redis"
import { ensureFileBookingBlock } from "@/lib/repositories/file-stay-repository"
import { isDateString, todayInManila } from "@/lib/stay-availability"
import { removeStayBookingBlock } from "@/lib/stay-repository"

export type BookingOperationResult =
  | { ok: true; booking: BookingRecord; created?: boolean }
  | { ok: false; error: string }

export type AcceptPackageInput = {
  inquiryId: string
  travelDateFrom: string
  travelDateTo: string
  adults: number
  children: number
  total: number
  currency: string
  holdExpiresAt?: string
  quoteNote?: string
}

export type PaymentInput = {
  bookingId: string
  kind: BookingPaymentKind
  amount: number
  occurredAt: string
  method: BookingPaymentMethod
  reference?: string
  note?: string
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function cleanOptional(value: string | undefined, max = 500) {
  const cleaned = value?.trim()
  return cleaned ? cleaned.slice(0, max) : undefined
}

function eventFor(
  booking: BookingRecord,
    kind: Parameters<typeof appendActivitySafely>[0]["kind"],
  summary: string,
  metadata?: Record<string, string | number | boolean | null>,
  actor: "admin" | "system" = "admin"
) {
  return {
    id: createActivityId(),
    entityType: "booking" as const,
    entityId: booking.id,
    inquiryId: booking.inquiryId,
    bookingId: booking.id,
    productType: getBookingProductType(booking),
    customerName: booking.guestName,
    kind,
    summary,
    actor,
    occurredAt: new Date().toISOString(),
    metadata
  }
}

export async function notifyBookingAndAudit(
  booking: BookingRecord,
  subject: string,
  lines: string[]
) {
  let status: Awaited<ReturnType<typeof notifyBookingUpdate>>
  try {
    status = await notifyBookingUpdate(booking, subject, lines)
  } catch (error) {
    console.error(`[booking] notification for ${booking.id} failed before completion`, error)
    status = "failed"
  }
  if (status === "not-configured") return
  await appendActivitySafely(
    eventFor(
      booking,
      status === "sent" ? "notification.sent" : "notification.failed",
      status === "sent" ? "Guest notification sent" : "Guest notification failed",
      { subject },
      "system"
    )
  )
}

export async function acceptPackageInquiry(
  input: AcceptPackageInput
): Promise<BookingOperationResult> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.inquiryId !== "string" ||
    typeof input.travelDateFrom !== "string" ||
    typeof input.travelDateTo !== "string" ||
    typeof input.currency !== "string" ||
    (input.holdExpiresAt !== undefined && typeof input.holdExpiresAt !== "string") ||
    (input.quoteNote !== undefined && typeof input.quoteNote !== "string")
  ) {
    return { ok: false, error: "Enter a valid final quote." }
  }
  const inquiry = await getInquiryById(input.inquiryId)
  if (!inquiry) return { ok: false, error: "Inquiry not found." }
  if (!inquiry.packageId || !inquiry.packageTitle) {
    return { ok: false, error: "Only a package inquiry can use a final quote." }
  }

  const existing = inquiry.bookingId
    ? await getBookingById(inquiry.bookingId)
    : (await listBookings()).find((booking) => booking.inquiryId === inquiry.id) ?? null
  if (existing) {
    if (getBookingProductType(existing) !== "package" || existing.inquiryId !== inquiry.id) {
      return { ok: false, error: "This inquiry points to a different booking record." }
    }
    if (
      inquiry.status !== "accepted" ||
      inquiry.bookingId !== existing.id ||
      inquiry.bookingStatus !== existing.status
    ) {
      if (inquiry.status === "declined" || inquiry.status === "archived") {
        return { ok: false, error: "Reopen this inquiry before restoring its booking link." }
      }
      try {
        const repaired = await updateInquiry(inquiry.id, {
          status: "accepted",
          bookingId: existing.id,
          bookingStatus: existing.status,
          acceptedAt: existing.createdAt,
          quotedTotal: existing.total,
          quotedCurrency: existing.currency
        })
        if (!repaired) return { ok: false, error: "The existing booking could not repair its inquiry." }
      } catch (error) {
        console.error(`Failed to repair inquiry ${inquiry.id} for booking ${existing.id}`, error)
        return { ok: false, error: "The existing booking could not repair its inquiry." }
      }
    }
    return { ok: true, booking: existing, created: false }
  }
  if (inquiry.status === "declined" || inquiry.status === "archived") {
    return { ok: false, error: "Reopen this inquiry before accepting it." }
  }
  if (
    !isDateString(input.travelDateFrom) ||
    !isDateString(input.travelDateTo) ||
    input.travelDateTo < input.travelDateFrom
  ) {
    return { ok: false, error: "Enter a valid departure and return date." }
  }
  if (input.travelDateFrom < todayInManila()) {
    return { ok: false, error: "The departure date cannot be in the past." }
  }
  if (!Number.isInteger(input.adults) || input.adults < 1 || !Number.isInteger(input.children) || input.children < 0) {
    return { ok: false, error: "Enter at least one adult and a valid child count." }
  }
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { ok: false, error: "The final quote must be greater than zero." }
  }
  const currency = input.currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Use a three-letter currency code." }
  const holdExpiresAt = cleanOptional(input.holdExpiresAt, 40)
  if (holdExpiresAt && Number.isNaN(Date.parse(holdExpiresAt))) {
    return { ok: false, error: "Enter a valid hold deadline." }
  }

  const catalog = await getAllPackagesForAdmin()
  const pkg = [...catalog.local, ...catalog.international].find((item) => item.id === inquiry.packageId)
  if (!pkg) return { ok: false, error: "The selected package no longer exists." }

  const now = new Date().toISOString()
  let booking: PackageBookingRecord = {
    id: uniqueId("book"),
    inquiryId: inquiry.id,
    productType: "package",
    packageId: pkg.id,
    packageTitle: inquiry.packageTitle,
    packageSlug: inquiry.packageSlug ?? derivePackageSlug(pkg),
    packageCategory: inquiry.packageCategory ?? pkg.category,
    ...(inquiry.departureId ? { departureId: inquiry.departureId } : {}),
    guestName: inquiry.name,
    guestEmail: inquiry.email,
    guestMobile: inquiry.mobile,
    travelDateFrom: input.travelDateFrom,
    travelDateTo: input.travelDateTo,
    adults: input.adults,
    children: input.children,
    total: input.total,
    currency,
    status: "held",
    paymentStatus: "unpaid",
    payments: [],
    holdExpiresAt,
    quoteNote: cleanOptional(input.quoteNote),
    createdAt: now,
    updatedAt: now
  }

  let created = true
  try {
    if (bookingStoreMode() === "kv") {
      const response = await getRedis().eval<
        [string, string, string, string],
        [string, string]
      >(
        `
          local mapped = redis.call("GET", KEYS[3])
          if mapped then return {"duplicate", cjson.decode(mapped)} end
          local raw = redis.call("GET", KEYS[1])
          if not raw then return {"not_found", ""} end
          local inquiry = cjson.decode(raw)
          if not inquiry["packageId"] then return {"not_package", ""} end
          if inquiry["status"] == "declined" or inquiry["status"] == "archived" then return {"closed", ""} end
          local booking = cjson.decode(ARGV[2])
          inquiry["status"] = "accepted"
          inquiry["bookingId"] = booking["id"]
          inquiry["bookingStatus"] = booking["status"]
          inquiry["acceptedAt"] = booking["createdAt"]
          inquiry["quotedTotal"] = booking["total"]
          inquiry["quotedCurrency"] = booking["currency"]
          redis.call("SET", KEYS[1], cjson.encode(inquiry))
          redis.call("SET", KEYS[2], ARGV[2])
          redis.call("SET", KEYS[3], cjson.encode(ARGV[1]))
          redis.call("LPUSH", KEYS[4], cjson.encode(ARGV[1]))
          return {"created", ARGV[1]}
        `,
        [
          `inquiry:${inquiry.id}`,
          `booking:${booking.id}`,
          `booking:inquiry:${inquiry.id}`,
          process.env.BOOKING_INDEX_KV_KEY?.trim() || "bookings:index"
        ],
        [booking.id, JSON.stringify(booking), inquiry.packageId, now]
      )
      if (response[0] !== "created") {
        if (response[0] === "duplicate") {
          const duplicate = await getBookingById(response[1])
          return duplicate ? { ok: true, booking: duplicate, created: false } : { ok: false, error: "The existing booking could not be loaded." }
        }
        return { ok: false, error: "The inquiry changed before the quote was accepted." }
      }
    } else {
      await createBooking(booking)
      const stored = (await listBookings()).find((item) => item.inquiryId === inquiry.id)
      if (!stored || getBookingProductType(stored) !== "package") {
        return { ok: false, error: "The package booking could not be reloaded." }
      }
      created = stored.id === booking.id
      booking = stored as PackageBookingRecord
      const updated = await updateInquiry(inquiry.id, {
        status: "accepted",
        bookingId: booking.id,
        bookingStatus: booking.status,
        acceptedAt: booking.createdAt,
        quotedTotal: booking.total,
        quotedCurrency: booking.currency
      })
      if (!updated) return { ok: false, error: "The inquiry could not be updated." }
    }

    if (created) {
      await appendActivitySafely({
        ...eventFor(booking, "booking.created", "Package final quote accepted"),
        id: `act-booking-created-${booking.id}`,
        occurredAt: booking.createdAt,
        metadata: { total: booking.total, currency: booking.currency }
      })
      await notifyBookingAndAudit(booking, `Your package dates are being held — ${getBookingTitle(booking)}`, [
        "We accepted your final quote and are holding your booking while we arrange the deposit."
      ])
    }
    return { ok: true, booking, created }
  } catch (error) {
    console.error("Failed to accept package inquiry", error)
    return { ok: false, error: "The package booking could not be stored." }
  }
}

export async function updateBookingQuote(
  bookingId: string,
  total: number,
  currency: string,
  note?: string
): Promise<BookingOperationResult> {
  if (
    typeof bookingId !== "string" ||
    typeof currency !== "string" ||
    (note !== undefined && typeof note !== "string")
  ) {
    return { ok: false, error: "Enter a valid total and currency." }
  }
  const booking = await getBookingById(bookingId)
  if (!booking) return { ok: false, error: "Booking not found." }
  if (booking.status === "completed" || booking.status === "cancelled") {
    return { ok: false, error: "Completed or cancelled bookings cannot be repriced." }
  }
  const code = currency.trim().toUpperCase()
  if (!Number.isFinite(total) || total <= 0 || !/^[A-Z]{3}$/.test(code)) {
    return { ok: false, error: "Enter a valid total and currency." }
  }
  const { netPaid } = bookingPaymentTotals(booking)
  if (total < netPaid) return { ok: false, error: "The quote cannot be lower than the amount already paid." }
  if (netPaid > 0 && code !== booking.currency) {
    return { ok: false, error: "The currency cannot change after a payment is recorded." }
  }

  const previousTotal = booking.total
  const previousCurrency = booking.currency
  const updated: BookingRecord = {
    ...booking,
    total,
    currency: code,
    quoteNote: cleanOptional(note),
    paymentStatus: deriveBookingPaymentStatus({ ...booking, total, currency: code }),
    updatedAt: new Date().toISOString()
  }
  if (!(await updateBooking(updated, booking.updatedAt))) return { ok: false, error: "The booking changed. Refresh and retry." }
  await updateInquiry(booking.inquiryId, { quotedTotal: total, quotedCurrency: code })
  await appendActivitySafely(
    eventFor(updated, "booking.quote-updated", "Final quote updated", {
      previousTotal,
      previousCurrency,
      total,
      currency: code
    })
  )
  await notifyBookingAndAudit(updated, `Updated final quote — ${getBookingTitle(updated)}`, [
    "Your final booking quote was updated. Please review the new total below."
  ])
  return { ok: true, booking: updated }
}

export async function recordBookingPayment(input: PaymentInput): Promise<BookingOperationResult> {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.bookingId !== "string" ||
    typeof input.occurredAt !== "string" ||
    !isBookingPaymentKind(input.kind) ||
    !isBookingPaymentMethod(input.method) ||
    (input.reference !== undefined && typeof input.reference !== "string") ||
    (input.note !== undefined && typeof input.note !== "string")
  ) {
    return { ok: false, error: "Choose a valid payment type and method." }
  }
  const booking = await getBookingById(input.bookingId)
  if (!booking) return { ok: false, error: "Booking not found." }
  if ((booking.status === "completed" || booking.status === "cancelled") && input.kind === "payment") {
    return { ok: false, error: "Only refunds can be recorded for a closed booking." }
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." }
  }
  if (!isDateString(input.occurredAt)) return { ok: false, error: "Enter a valid payment date." }

  const totals = bookingPaymentTotals(booking)
  if (input.kind === "payment" && input.amount > totals.balance) {
    return { ok: false, error: "The payment exceeds the outstanding balance." }
  }
  if (input.kind === "refund" && input.amount > totals.netPaid) {
    return { ok: false, error: "The refund exceeds the net amount received." }
  }

  const now = new Date().toISOString()
  const entry: BookingPaymentEntry = {
    id: uniqueId(input.kind === "payment" ? "pay" : "refund"),
    kind: input.kind,
    amount: input.amount,
    currency: booking.currency,
    occurredAt: input.occurredAt,
    method: input.method,
    reference: cleanOptional(input.reference, 120),
    note: cleanOptional(input.note),
    recordedAt: now
  }
  const withPayment: BookingRecord = {
    ...booking,
    payments: [...getBookingPayments(booking), entry],
    updatedAt: now
  }
  const updated: BookingRecord = {
    ...withPayment,
    paymentStatus: deriveBookingPaymentStatus(withPayment)
  }
  if (!(await updateBooking(updated, booking.updatedAt))) return { ok: false, error: "The booking changed. Refresh and retry." }

  await appendActivitySafely(
    eventFor(
      updated,
      input.kind === "payment" ? "booking.payment-recorded" : "booking.refund-recorded",
      input.kind === "payment" ? "Payment recorded" : "Refund recorded",
      { amount: input.amount, currency: booking.currency, method: input.method }
    )
  )
  await notifyBookingAndAudit(
    updated,
    `${input.kind === "payment" ? "Payment" : "Refund"} recorded — ${getBookingTitle(updated)}`,
    [`We recorded a ${input.kind} of ${input.amount.toLocaleString("en-PH")} ${booking.currency}.`]
  )
  return { ok: true, booking: updated }
}

function stayStoreMode(): "file" | "kv" {
  return (process.env.STAY_STORE ?? process.env.PACKAGE_STORE)?.trim().toLowerCase() === "kv"
    ? "kv"
    : "file"
}

async function persistRedisStatusTransition(
  previous: BookingRecord,
  updated: BookingRecord
): Promise<BookingRecord | null> {
  const releaseStay = updated.status === "cancelled" && getBookingProductType(previous) === "stay"
  const stayId = releaseStay ? (previous as StayBookingRecord).stayId : ""
  const response = await getRedis().eval<
    [string, string, string, string, string, string, string],
    [string, unknown]
  >(
    `
      local bookingRaw = redis.call("GET", KEYS[1])
      if not bookingRaw then return {"not_found", ""} end
      local current = cjson.decode(bookingRaw)
      if (current["updatedAt"] or "") ~= ARGV[1] then return {"conflict", ""} end

      local inquiryRaw = redis.call("GET", KEYS[2])
      if not inquiryRaw then return {"inquiry_not_found", ""} end
      local inquiry = cjson.decode(inquiryRaw)

      local catalog = nil
      if ARGV[4] == "1" then
        local catalogRaw = redis.call("GET", KEYS[3])
        if not catalogRaw then return {"stay_not_found", ""} end
        catalog = cjson.decode(catalogRaw)
        local found = false
        for _, stay in ipairs(catalog) do
          if stay["id"] == ARGV[5] then
            found = true
            local kept = {}
            for _, block in ipairs(stay["blocks"] or {}) do
              if block["bookingId"] ~= ARGV[6] then table.insert(kept, block) end
            end
            stay["blocks"] = kept
            stay["availabilityUpdatedAt"] = ARGV[7]
            break
          end
        end
        if not found then return {"stay_not_found", ""} end
      end

      inquiry["bookingStatus"] = ARGV[3]
      redis.call("SET", KEYS[1], ARGV[2])
      redis.call("SET", KEYS[2], cjson.encode(inquiry))
      if catalog then redis.call("SET", KEYS[3], cjson.encode(catalog)) end
      return {"updated", ARGV[2]}
    `,
    [
      `booking:${previous.id}`,
      `inquiry:${previous.inquiryId}`,
      process.env.STAY_CATALOG_KV_KEY?.trim() || "stays:catalog"
    ],
    [
      previous.updatedAt,
      JSON.stringify(updated),
      updated.status,
      releaseStay ? "1" : "0",
      stayId,
      previous.id,
      updated.updatedAt
    ]
  )

  return response[0] === "updated" && response[1] && typeof response[1] === "object"
    ? (response[1] as BookingRecord)
    : null
}

async function restoreFileTransition(
  previous: BookingRecord,
  updated: BookingRecord,
  releasedStay: StayBookingRecord | null
) {
  const restoredBooking = await updateBooking(previous, updated.updatedAt)
  if (!restoredBooking) {
    throw new Error(`Could not roll back booking ${previous.id} after a file-store failure`)
  }
  if (releasedStay) {
    const restoredStay = await ensureFileBookingBlock(releasedStay)
    if (!restoredStay) {
      throw new Error(`Could not restore the condo block for booking ${previous.id}`)
    }
  }
}

async function persistFileStatusTransition(
  previous: BookingRecord,
  updated: BookingRecord
): Promise<BookingRecord | null> {
  const releasedStay =
    updated.status === "cancelled" && getBookingProductType(previous) === "stay"
      ? (previous as StayBookingRecord)
      : null

  if (releasedStay) {
    const released = await removeStayBookingBlock(releasedStay.stayId, previous.id)
    if (!released) return null
  }

  const stored = await updateBooking(updated, previous.updatedAt)
  if (!stored) {
    if (releasedStay) await ensureFileBookingBlock(releasedStay)
    return null
  }

  try {
    const inquiry = await updateInquiry(previous.inquiryId, { bookingStatus: updated.status })
    if (!inquiry) {
      await restoreFileTransition(previous, updated, releasedStay)
      return null
    }
    return stored
  } catch (error) {
    await restoreFileTransition(previous, updated, releasedStay)
    throw error
  }
}

async function persistStatusTransition(
  previous: BookingRecord,
  updated: BookingRecord
): Promise<BookingRecord | null> {
  if (bookingStoreMode() !== stayStoreMode() && getBookingProductType(previous) === "stay") {
    throw new Error("Booking and condo inventory are configured with different storage backends")
  }
  return bookingStoreMode() === "kv"
    ? persistRedisStatusTransition(previous, updated)
    : persistFileStatusTransition(previous, updated)
}

export async function changeBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<BookingOperationResult> {
  if (
    typeof bookingId !== "string" ||
    !isBookingStatus(status) ||
    (reason !== undefined && typeof reason !== "string")
  ) {
    return { ok: false, error: "Choose a valid booking status." }
  }
  const booking = await getBookingById(bookingId)
  if (!booking) return { ok: false, error: "Booking not found." }
  if (booking.status === "completed" || booking.status === "cancelled") {
    return { ok: false, error: "Completed and cancelled bookings are final." }
  }
  if (status === "held") return { ok: false, error: "A booking cannot move back to held." }
  if (status === "confirmed" && bookingPaymentTotals(booking).netPaid <= 0) {
    return { ok: false, error: "Record a deposit before confirming this booking." }
  }
  if (status === "completed") {
    if (booking.status !== "confirmed") return { ok: false, error: "Confirm the booking before completing it." }
    if (getBookingEndDate(booking) > todayInManila()) {
      return { ok: false, error: "A booking cannot be completed before its end date." }
    }
  }
  const cancellationReason = cleanOptional(reason)
  if (status === "cancelled" && !cancellationReason) {
    return { ok: false, error: "Enter a cancellation reason." }
  }

  const now = new Date().toISOString()
  const updated: BookingRecord = {
    ...booking,
    status,
    ...(status === "cancelled" ? { cancelledAt: now, cancellationReason } : {}),
    ...(status === "completed" ? { completedAt: now } : {}),
    updatedAt: now
  }
  let persisted: BookingRecord | null
  try {
    persisted = await persistStatusTransition(booking, updated)
  } catch (error) {
    console.error(`Failed to persist status transition for booking ${booking.id}`, error)
    return { ok: false, error: "The booking status could not be updated safely. Refresh and retry." }
  }
  if (!persisted) return { ok: false, error: "The booking changed. Refresh and retry." }

  if (status === "cancelled" && getBookingProductType(booking) === "stay") {
    await appendActivitySafely(eventFor(updated, "booking.dates-released", "Condo dates released"))
  }
  await appendActivitySafely(
    eventFor(updated, "booking.status-changed", `Booking changed from ${booking.status} to ${status}`, {
      from: booking.status,
      to: status,
      reason: cancellationReason ?? null
    })
  )
  await notifyBookingAndAudit(updated, `Booking ${status} — ${getBookingTitle(updated)}`, [
    status === "confirmed"
      ? "Your deposit was acknowledged and your booking is now confirmed."
      : status === "cancelled"
        ? `Your booking was cancelled. Reason: ${cancellationReason}`
        : "Your booking has been marked complete. Thank you for travelling with us."
  ])
  return { ok: true, booking: updated }
}
