import {
  InquiryHasBookingError,
  isInquiryRecord,
  type CreateInquiryPayload,
  type InquiryRecord,
  type InquiryRepository,
  type UpdateInquiryPayload
} from "@/lib/inquiry-types"
import { getRedis } from "@/lib/redis"

const DEFAULT_INDEX_KEY = "inquiries:index"

function getIndexKey() {
  return process.env.INQUIRY_INDEX_KV_KEY?.trim() || DEFAULT_INDEX_KEY
}

function getRecordKey(id: string) {
  return `inquiry:${id}`
}

function createUniqueId() {
  return `inq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Inquiries are stored one record per key with a separate index list holding ids
 * newest-first. Unlike the package catalog (a single JSON blob), submissions
 * arrive concurrently from the public site, so `lpush` gives us an atomic append
 * and status updates touch only one key instead of rewriting the whole store.
 */
async function listInquiries(): Promise<InquiryRecord[]> {
  const redis = getRedis()
  const ids = await redis.lrange<string>(getIndexKey(), 0, -1)
  if (!ids || ids.length === 0) return []

  const records = await Promise.all(ids.map((id) => redis.get<unknown>(getRecordKey(id))))
  return records.filter(isInquiryRecord)
}

async function getInquiryById(id: string): Promise<InquiryRecord | null> {
  const record = await getRedis().get<unknown>(getRecordKey(id))
  return isInquiryRecord(record) ? record : null
}

async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord> {
  const record: InquiryRecord = {
    ...payload,
    id: createUniqueId(),
    status: "new",
    createdAt: new Date().toISOString()
  }

  const transaction = getRedis().multi()
  transaction.set(getRecordKey(record.id), record)
  transaction.lpush(getIndexKey(), record.id)
  await transaction.exec()

  return record
}

async function updateInquiry(
  id: string,
  updates: UpdateInquiryPayload
): Promise<InquiryRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local record = cjson.decode(raw)
    local updates = cjson.decode(ARGV[1])
    if record["bookingId"] and updates["status"] and updates["status"] ~= "archived"
      and not (updates["status"] == "accepted" and updates["bookingId"] == record["bookingId"]) then
      return "booking_locked"
    end
    for key, value in pairs(updates) do record[key] = value end
    local encoded = cjson.encode(record)
    redis.call("SET", KEYS[1], encoded)
    return encoded
  `
  const updated = await getRedis().eval<[string], unknown>(
    script,
    [getRecordKey(id)],
    [JSON.stringify(updates)]
  )
  if (updated === "booking_locked") throw new InquiryHasBookingError()
  return isInquiryRecord(updated) ? updated : null
}

async function deleteInquiry(id: string): Promise<InquiryRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local record = cjson.decode(raw)
    if record["bookingId"] then return "booking_locked" end
    redis.call("DEL", KEYS[1])
    redis.call("LREM", KEYS[2], 0, ARGV[1])
    return raw
  `
  const deleted = await getRedis().eval<[string], unknown>(
    script,
    [getRecordKey(id), getIndexKey()],
    [id]
  )
  if (deleted === "booking_locked") throw new InquiryHasBookingError()
  return isInquiryRecord(deleted) ? deleted : null
}

export const kvInquiryRepository: InquiryRepository = {
  listInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  deleteInquiry
}
