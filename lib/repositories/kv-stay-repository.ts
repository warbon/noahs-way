import { getRedis } from "@/lib/redis"
import { normalizeBlocks } from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"
import {
  StayHasBookingsError,
  type CreateStayPayload,
  type GetStaysOptions,
  type StayRecord,
  type StayRepository,
  type StayStore,
  type UpdateStayPayload
} from "@/lib/stay-repository-types"

const DEFAULT_STORE_KEY = "stays:catalog"

function getStoreKey() {
  return process.env.STAY_CATALOG_KV_KEY?.trim() || DEFAULT_STORE_KEY
}

function createUniqueId() {
  return `stay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isStayRecord(value: unknown): value is StayRecord {
  if (!value || typeof value !== "object") return false

  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.details === "string" &&
    typeof record.previewImage === "string" &&
    typeof record.imagePath === "string" &&
    typeof record.nightlyRate === "number" &&
    Number.isFinite(record.nightlyRate) &&
    typeof record.city === "string" &&
    typeof record.bedrooms === "number" &&
    typeof record.maxGuests === "number"
  )
}

/**
 * Reads the whole list from a single KV key, mirroring the package catalog.
 * An absent key means a fresh deployment with nothing listed yet, which is a
 * valid state rather than an error.
 */
async function readStore(): Promise<StayStore> {
  const raw = await getRedis().get<unknown>(getStoreKey())
  if (!Array.isArray(raw)) return []

  return raw.filter(isStayRecord).map((stay) => ({ ...stay, blocks: normalizeBlocks(stay.blocks) }))
}

function isPublished(stay: StayRecord) {
  return stay.status !== "draft"
}

async function getStays(options: GetStaysOptions = {}): Promise<StayRecord[]> {
  const store = await readStore()
  return options.includeDrafts ? store : store.filter(isPublished)
}

async function getStayById(id: string): Promise<StayRecord | null> {
  const store = await readStore()
  return store.find((stay) => stay.id === id) ?? null
}

async function createStay(payload: CreateStayPayload): Promise<StayRecord> {
  const stay: StayRecord = {
    ...payload,
    id: createUniqueId(),
    createdAt: new Date().toISOString(),
    previewImage: payload.previewImage ?? payload.imagePath,
    blocks: normalizeBlocks(payload.blocks)
  }

  const script = `
    local raw = redis.call("GET", KEYS[1])
    local store = raw and cjson.decode(raw) or {}
    local stay = cjson.decode(ARGV[1])
    table.insert(store, 1, stay)
    redis.call("SET", KEYS[1], cjson.encode(store))
    return 1
  `
  await getRedis().eval<[string], number>(script, [getStoreKey()], [JSON.stringify(stay)])
  return stay
}

async function updateStay(id: string, updates: UpdateStayPayload): Promise<StayRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local store = cjson.decode(raw)
    local updates = cjson.decode(ARGV[2])
    for _, stay in ipairs(store) do
      if stay["id"] == ARGV[1] then
        local existingImagePath = stay["imagePath"]
        local existingPreviewImage = stay["previewImage"]
        for key, value in pairs(updates) do stay[key] = value end
        stay["id"] = ARGV[1]
        stay["imagePath"] = updates["imagePath"] or existingImagePath
        stay["previewImage"] = updates["previewImage"] or updates["imagePath"] or existingPreviewImage
        stay["updatedAt"] = ARGV[3]
        redis.call("SET", KEYS[1], cjson.encode(store))
        return cjson.encode(stay)
      end
    end
    return nil
  `
  const updated = await getRedis().eval<[string, string, string], unknown>(
    script,
    [getStoreKey()],
    [id, JSON.stringify(updates), new Date().toISOString()]
  )
  return isStayRecord(updated) ? { ...updated, blocks: normalizeBlocks(updated.blocks) } : null
}

async function setStayAvailability(
  id: string,
  blocks: AvailabilityBlock[]
): Promise<StayRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local store = cjson.decode(raw)
    local requested = cjson.decode(ARGV[2])
    for _, stay in ipairs(store) do
      if stay["id"] == ARGV[1] then
        local preserved = {}
        for _, block in ipairs(stay["blocks"] or {}) do
          if block["source"] == "booking" and block["bookingId"] then
            table.insert(preserved, block)
          end
        end
        for _, block in ipairs(requested) do
          if block["source"] ~= "booking" then table.insert(preserved, block) end
        end
        stay["blocks"] = preserved
        stay["availabilityUpdatedAt"] = ARGV[3]
        redis.call("SET", KEYS[1], cjson.encode(store))
        return cjson.encode(stay)
      end
    end
    return nil
  `
  const updated = await getRedis().eval<[string, string, string], unknown>(
    script,
    [getStoreKey()],
    [id, JSON.stringify(normalizeBlocks(blocks)), new Date().toISOString()]
  )
  return isStayRecord(updated) ? { ...updated, blocks: normalizeBlocks(updated.blocks) } : null
}

async function deleteStay(id: string): Promise<StayRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local store = cjson.decode(raw)
    for index, stay in ipairs(store) do
      if stay["id"] == ARGV[1] then
        for _, block in ipairs(stay["blocks"] or {}) do
          if block["source"] == "booking" and block["bookingId"] then
            return {"blocked", ""}
          end
        end
        table.remove(store, index)
        redis.call("SET", KEYS[1], cjson.encode(store))
        return {"deleted", cjson.encode(stay)}
      end
    end
    return {"not_found", ""}
  `
  const [status, deleted] = await getRedis().eval<[string], [string, unknown]>(
    script,
    [getStoreKey()],
    [id]
  )
  if (status === "blocked") throw new StayHasBookingsError()
  return isStayRecord(deleted) ? { ...deleted, blocks: normalizeBlocks(deleted.blocks) } : null
}

export async function removeKvBookingBlock(
  stayId: string,
  bookingId: string
): Promise<StayRecord | null> {
  const script = `
    local raw = redis.call("GET", KEYS[1])
    if not raw then return nil end
    local store = cjson.decode(raw)
    for _, stay in ipairs(store) do
      if stay["id"] == ARGV[1] then
        local kept = {}
        for _, block in ipairs(stay["blocks"] or {}) do
          if block["bookingId"] ~= ARGV[2] then table.insert(kept, block) end
        end
        stay["blocks"] = kept
        stay["availabilityUpdatedAt"] = ARGV[3]
        redis.call("SET", KEYS[1], cjson.encode(store))
        return cjson.encode(stay)
      end
    end
    return nil
  `
  const updated = await getRedis().eval<[string, string, string], unknown>(
    script,
    [getStoreKey()],
    [stayId, bookingId, new Date().toISOString()]
  )
  return isStayRecord(updated) ? { ...updated, blocks: normalizeBlocks(updated.blocks) } : null
}

export const kvStayRepository: StayRepository = {
  getStays,
  getStayById,
  createStay,
  updateStay,
  deleteStay,
  setStayAvailability
}
