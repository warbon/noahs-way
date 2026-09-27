import { isBookingRecord, type BookingRecord } from "@/lib/booking-types"
import { getRedis } from "@/lib/redis"
import {
  createFileBooking,
  getFileBookingById,
  listFileBookings,
  updateFileBooking
} from "@/lib/repositories/file-booking-repository"

const DEFAULT_INDEX_KEY = "bookings:index"

export function bookingStoreMode(): "file" | "kv" {
  return process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv" ? "kv" : "file"
}

function indexKey() {
  return process.env.BOOKING_INDEX_KV_KEY?.trim() || DEFAULT_INDEX_KEY
}

function recordKey(id: string) {
  return `booking:${id}`
}

export async function listBookings(): Promise<BookingRecord[]> {
  if (bookingStoreMode() === "file") return listFileBookings()

  const redis = getRedis()
  const ids = await redis.lrange<string>(indexKey(), 0, -1)
  if (!ids.length) return []
  const records = await redis.mget<unknown[]>(...ids.map(recordKey))
  return records.filter(isBookingRecord)
}

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  if (bookingStoreMode() === "file") return getFileBookingById(id)
  const record = await getRedis().get<unknown>(recordKey(id))
  return isBookingRecord(record) ? record : null
}

export async function createBooking(booking: BookingRecord): Promise<void> {
  if (bookingStoreMode() === "file") {
    await createFileBooking(booking)
    return
  }
  const transaction = getRedis().multi()
  transaction.set(recordKey(booking.id), booking)
  transaction.lpush(indexKey(), booking.id)
  await transaction.exec()
}

export async function updateBooking(
  booking: BookingRecord,
  expectedUpdatedAt?: string
): Promise<BookingRecord | null> {
  if (bookingStoreMode() === "file") {
    return updateFileBooking(booking.id, booking, expectedUpdatedAt)
  }

  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    if ARGV[2] ~= "" then
      local current = cjson.decode(raw)
      if (current["updatedAt"] or "") ~= ARGV[2] then return nil end
    end
    redis.call("SET", KEYS[1], ARGV[1])
    return ARGV[1]
  `
  const updated = await getRedis().eval<[string, string], unknown>(
    script,
    [recordKey(booking.id)],
    [JSON.stringify(booking), expectedUpdatedAt ?? ""]
  )
  return isBookingRecord(updated) ? updated : null
}
