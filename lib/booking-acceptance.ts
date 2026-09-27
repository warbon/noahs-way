import {
  type StayBookingRecord,
  isBookingRecord
} from "@/lib/booking-types"
import {
  createFileBooking,
  getFileBookingById,
  getFileBookingByInquiryId
} from "@/lib/repositories/file-booking-repository"
import { ensureFileBookingBlock } from "@/lib/repositories/file-stay-repository"
import { getInquiryById, updateInquiry } from "@/lib/inquiry-repository"
import type { InquiryRecord } from "@/lib/inquiry-types"
import { getRedis } from "@/lib/redis"
import { checkStayRange, quoteStay } from "@/lib/stay-availability"
import { getStayById } from "@/lib/stay-repository"
import type { StayRecord } from "@/lib/stay-repository-types"
import { deriveSlug } from "@/lib/slug"

type AcceptBookingErrorCode =
  | "not-found"
  | "not-a-stay"
  | "invalid"
  | "conflict"
  | "closed"
  | "configuration"
  | "storage"

export type AcceptBookingResult =
  | {
      ok: true
      booking: StayBookingRecord
      inquiry: InquiryRecord
      created: boolean
    }
  | {
      ok: false
      status: 400 | 404 | 409 | 503
      code: AcceptBookingErrorCode
      error: string
    }

function createBookingId() {
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildBooking(
  inquiry: InquiryRecord,
  stay: StayRecord,
  now: string
): StayBookingRecord | AcceptBookingResult {
  if (!inquiry.stayId || !inquiry.checkIn || !inquiry.checkOut || !inquiry.stayTitle) {
    return {
      ok: false,
      status: 400,
      code: "not-a-stay",
      error: "This inquiry is not a complete condo stay request."
    }
  }

  const range = checkStayRange(inquiry.checkIn, inquiry.checkOut, stay)
  if (!range.ok) {
    return {
      ok: false,
      status: 409,
      code: "conflict",
      error: range.error
    }
  }

  if (inquiry.guests !== undefined && inquiry.guests > stay.maxGuests) {
    return {
      ok: false,
      status: 409,
      code: "conflict",
      error: `This unit now allows at most ${stay.maxGuests} guests.`
    }
  }

  const quote = quoteStay(stay, range.nights)
  return {
    id: createBookingId(),
    productType: "stay",
    inquiryId: inquiry.id,
    stayId: stay.id,
    stayTitle: stay.title,
    staySlug: deriveSlug(stay, "stay"),
    guestName: inquiry.name,
    guestEmail: inquiry.email,
    guestMobile: inquiry.mobile,
    guests: inquiry.guests,
    guestCount: inquiry.guests,
    checkIn: inquiry.checkIn,
    checkOut: inquiry.checkOut,
    nights: range.nights,
    nightlyRate: quote.nightlyRate,
    cleaningFee: quote.cleaningFee,
    accommodation: quote.accommodation,
    total: quote.total,
    currency: quote.currency,
    status: "held",
    paymentStatus: "unpaid",
    payments: [],
    createdAt: now,
    updatedAt: now
  }
}

function acceptedInquiryUpdate(booking: StayBookingRecord) {
  return {
    status: "accepted" as const,
    bookingId: booking.id,
    bookingStatus: booking.status,
    acceptedAt: booking.createdAt,
    quotedNightlyRate: booking.nightlyRate,
    quotedCleaningFee: booking.cleaningFee,
    quotedTotal: booking.total,
    quotedCurrency: booking.currency
  }
}

function repositoryModes() {
  const inquiryMode = process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv" ? "kv" : "file"
  const stayMode =
    (process.env.STAY_STORE ?? process.env.PACKAGE_STORE)?.trim().toLowerCase() === "kv"
      ? "kv"
      : "file"

  return { inquiryMode, stayMode }
}

let fileAcceptanceQueue: Promise<unknown> = Promise.resolve()

function serializeFileAcceptance<T>(operation: () => Promise<T>): Promise<T> {
  const pending = fileAcceptanceQueue.then(operation, operation)
  fileAcceptanceQueue = pending.then(
    () => undefined,
    () => undefined
  )
  return pending
}

async function restoreFileBookingState(
  booking: StayBookingRecord,
  inquiry: InquiryRecord,
  created: boolean
): Promise<AcceptBookingResult> {
  const heldStay = await ensureFileBookingBlock(booking)
  if (!heldStay) {
    return {
      ok: false,
      status: 503,
      code: "storage",
      error: "The booking exists, but its condo unit could not be updated."
    }
  }

  if (inquiry.bookingId && inquiry.bookingId !== booking.id) {
    return {
      ok: false,
      status: 503,
      code: "storage",
      error: "This inquiry points to a different booking record."
    }
  }

  let storedInquiry = inquiry
  if (inquiry.status !== "accepted" || inquiry.bookingId !== booking.id) {
    const updated = await updateInquiry(inquiry.id, acceptedInquiryUpdate(booking))
    if (!updated) {
      return { ok: false, status: 503, code: "storage", error: "Could not update the inquiry." }
    }
    storedInquiry = updated
  }

  return { ok: true, booking, inquiry: storedInquiry, created }
}

async function acceptWithFiles(
  inquiry: InquiryRecord,
  stay: StayRecord,
  candidate: StayBookingRecord
): Promise<AcceptBookingResult> {
  return serializeFileAcceptance(async () => {
    const freshInquiry = await getInquiryById(inquiry.id)
    if (!freshInquiry) {
      return { ok: false, status: 404, code: "not-found", error: "Inquiry not found." }
    }

    const existing =
      (freshInquiry.bookingId ? await getFileBookingById(freshInquiry.bookingId) : null) ??
      (await getFileBookingByInquiryId(freshInquiry.id))
    if (existing && existing.productType !== "package") {
      return restoreFileBookingState(existing, freshInquiry, false)
    }

    if (freshInquiry.status === "declined" || freshInquiry.status === "archived") {
      return {
        ok: false,
        status: 409,
        code: "closed",
        error: "Reopen this inquiry before accepting it."
      }
    }

    const freshStay = await getStayById(stay.id)
    if (!freshStay) {
      return { ok: false, status: 404, code: "not-found", error: "Condo unit not found." }
    }

    const rebuilt = buildBooking(freshInquiry, freshStay, candidate.createdAt)
    if (!("id" in rebuilt)) return rebuilt

    await createFileBooking(rebuilt)
    return restoreFileBookingState(rebuilt, freshInquiry, true)
  })
}

const ACCEPT_BOOKING_SCRIPT = `
local mapped = redis.call("GET", KEYS[4])
if mapped then
  return {"duplicate", cjson.decode(mapped)}
end

local inquiryRaw = redis.call("GET", KEYS[2])
if not inquiryRaw then return {"inquiry_not_found", ""} end
local inquiry = cjson.decode(inquiryRaw)

if inquiry["stayId"] ~= ARGV[1] or inquiry["checkIn"] ~= ARGV[2] or inquiry["checkOut"] ~= ARGV[3] then
  return {"mismatch", ""}
end
if inquiry["status"] == "declined" or inquiry["status"] == "archived" then
  return {"closed", ""}
end

local catalogRaw = redis.call("GET", KEYS[1])
if not catalogRaw then return {"stay_not_found", ""} end
local catalog = cjson.decode(catalogRaw)
local stayIndex = nil

for index, stay in ipairs(catalog) do
  if stay["id"] == ARGV[1] then
    stayIndex = index
    local currentRate = tonumber(stay["nightlyRate"] or 0)
    local currentCleaningFee = tonumber(stay["cleaningFee"] or 0)
    local currentCurrency = stay["currency"] or "PHP"
    local currentMaxGuests = tonumber(stay["maxGuests"] or 0)
    local currentMinimumNights = tonumber(stay["minimumNights"] or 1)
    if currentRate ~= tonumber(ARGV[7])
      or currentCleaningFee ~= tonumber(ARGV[8])
      or currentCurrency ~= ARGV[9]
      or currentMaxGuests ~= tonumber(ARGV[10])
      or currentMinimumNights ~= tonumber(ARGV[11])
      or (stay["updatedAt"] or "") ~= ARGV[12] then
      return {"stay_changed", ""}
    end
    local blocks = stay["blocks"] or {}
    for _, block in ipairs(blocks) do
      if ARGV[2] < block["to"] and ARGV[3] > block["from"] then
        return {"conflict", ""}
      end
    end
    table.insert(blocks, {
      from = ARGV[2],
      to = ARGV[3],
      note = "Booking " .. ARGV[4],
      source = "booking",
      bookingId = ARGV[4]
    })
    stay["blocks"] = blocks
    stay["availabilityUpdatedAt"] = ARGV[5]
    break
  end
end

if not stayIndex then return {"stay_not_found", ""} end

local booking = cjson.decode(ARGV[6])
inquiry["status"] = "accepted"
inquiry["bookingId"] = booking["id"]
inquiry["bookingStatus"] = booking["status"]
inquiry["acceptedAt"] = booking["createdAt"]
inquiry["quotedNightlyRate"] = booking["nightlyRate"]
inquiry["quotedCleaningFee"] = booking["cleaningFee"]
inquiry["quotedTotal"] = booking["total"]
inquiry["quotedCurrency"] = booking["currency"]

redis.call("SET", KEYS[1], cjson.encode(catalog))
redis.call("SET", KEYS[2], cjson.encode(inquiry))
redis.call("SET", KEYS[3], ARGV[6])
redis.call("SET", KEYS[4], cjson.encode(ARGV[4]))
redis.call("LPUSH", KEYS[5], cjson.encode(ARGV[4]))

return {"accepted", ARGV[4]}
`

async function acceptWithRedis(
  inquiry: InquiryRecord,
  stay: StayRecord,
  candidate: StayBookingRecord
): Promise<AcceptBookingResult> {
  const redis = getRedis()
  const catalogKey = process.env.STAY_CATALOG_KV_KEY?.trim() || "stays:catalog"
  const inquiryKey = `inquiry:${inquiry.id}`
  const bookingKey = `booking:${candidate.id}`
  const mappingKey = `booking:inquiry:${inquiry.id}`
  const indexKey = process.env.BOOKING_INDEX_KV_KEY?.trim() || "bookings:index"

  const response = await redis.eval<
    [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ],
    [string, string]
  >(
    ACCEPT_BOOKING_SCRIPT,
    [catalogKey, inquiryKey, bookingKey, mappingKey, indexKey],
    [
      candidate.stayId,
      candidate.checkIn,
      candidate.checkOut,
      candidate.id,
      candidate.createdAt,
      JSON.stringify(candidate),
      String(candidate.nightlyRate),
      String(candidate.cleaningFee),
      candidate.currency,
      String(stay.maxGuests),
      String(stay.minimumNights ?? 1),
      stay.updatedAt ?? ""
    ]
  )

  const [code, returnedBookingId] = response
  if (code === "conflict") {
    return {
      ok: false,
      status: 409,
      code: "conflict",
      error: "Those dates were blocked by another booking. Refresh the inquiry and choose another window."
    }
  }
  if (code === "closed") {
    return {
      ok: false,
      status: 409,
      code: "closed",
      error: "Reopen this inquiry before accepting it."
    }
  }
  if (code === "inquiry_not_found" || code === "stay_not_found") {
    return { ok: false, status: 404, code: "not-found", error: "Inquiry or condo unit not found." }
  }
  if (code === "mismatch") {
    return {
      ok: false,
      status: 409,
      code: "invalid",
      error: "The inquiry changed while it was being accepted. Refresh and try again."
    }
  }
  if (code === "stay_changed") {
    return {
      ok: false,
      status: 409,
      code: "invalid",
      error: "The unit details changed while it was being accepted. Refresh and review the quote again."
    }
  }

  const bookingId = returnedBookingId || candidate.id
  const [storedBooking, storedInquiry] = await Promise.all([
    redis.get<unknown>(`booking:${bookingId}`),
    getInquiryById(inquiry.id)
  ])

  if (!isBookingRecord(storedBooking) || storedBooking.productType === "package" || !storedInquiry) {
    return {
      ok: false,
      status: 503,
      code: "storage",
      error: "The booking was stored but could not be read back. Refresh before trying again."
    }
  }

  return {
    ok: true,
    booking: storedBooking,
    inquiry: storedInquiry,
    created: code === "accepted"
  }
}

export async function acceptStayInquiry(inquiryId: string): Promise<AcceptBookingResult> {
  const inquiry = await getInquiryById(inquiryId)
  if (!inquiry) {
    return { ok: false, status: 404, code: "not-found", error: "Inquiry not found." }
  }

  if (!inquiry.stayId) {
    return {
      ok: false,
      status: 400,
      code: "not-a-stay",
      error: "Only condo stay inquiries can be accepted here."
    }
  }

  const modes = repositoryModes()
  if (modes.inquiryMode !== modes.stayMode) {
    return {
      ok: false,
      status: 503,
      code: "configuration",
      error: "Inquiries and stays must use the same storage backend before a booking can be accepted."
    }
  }

  if (inquiry.bookingId) {
    try {
      const existing =
        modes.inquiryMode === "kv"
          ? await getRedis().get<unknown>(`booking:${inquiry.bookingId}`)
          : await getFileBookingById(inquiry.bookingId)

      if (isBookingRecord(existing) && existing.productType !== "package") {
        if (modes.inquiryMode === "file") {
          return await serializeFileAcceptance(() =>
            restoreFileBookingState(existing, inquiry, false)
          )
        }
        return { ok: true, booking: existing, inquiry, created: false }
      }
    } catch (error) {
      console.error("Failed to read accepted booking", error)
    }

    return {
      ok: false,
      status: 503,
      code: "storage",
      error: "This inquiry is marked accepted, but its booking record could not be loaded."
    }
  }

  const stay = await getStayById(inquiry.stayId)
  if (!stay) {
    return { ok: false, status: 404, code: "not-found", error: "Condo unit not found." }
  }

  const now = new Date().toISOString()
  const candidate = buildBooking(inquiry, stay, now)
  if (!("id" in candidate)) return candidate

  try {
    return modes.inquiryMode === "kv"
      ? await acceptWithRedis(inquiry, stay, candidate)
      : await acceptWithFiles(inquiry, stay, candidate)
  } catch (error) {
    console.error("Failed to accept stay inquiry", error)
    return {
      ok: false,
      status: 503,
      code: "storage",
      error: "The booking could not be stored. No acceptance was confirmed."
    }
  }
}
