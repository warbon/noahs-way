import { kv } from "@vercel/kv"

import { normalizeBlocks } from "@/lib/stay-availability"
import type { AvailabilityBlock } from "@/lib/stay-data"
import type {
  CreateStayPayload,
  GetStaysOptions,
  StayRecord,
  StayRepository,
  StayStore,
  UpdateStayPayload
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
  // @vercel/kv deserializes JSON automatically.
  const raw = await kv.get<unknown>(getStoreKey())
  if (!Array.isArray(raw)) return []

  return raw.filter(isStayRecord).map((stay) => ({ ...stay, blocks: normalizeBlocks(stay.blocks) }))
}

async function writeStore(store: StayStore) {
  await kv.set(getStoreKey(), store)
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
  const store = await readStore()
  const stay: StayRecord = {
    ...payload,
    id: createUniqueId(),
    createdAt: new Date().toISOString(),
    previewImage: payload.previewImage ?? payload.imagePath,
    blocks: normalizeBlocks(payload.blocks)
  }

  await writeStore([stay, ...store])
  return stay
}

async function updateStay(id: string, updates: UpdateStayPayload): Promise<StayRecord | null> {
  const store = await readStore()
  const index = store.findIndex((stay) => stay.id === id)
  if (index === -1) return null

  const existing = store[index]
  const updated: StayRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    imagePath: updates.imagePath ?? existing.imagePath,
    previewImage: updates.previewImage ?? updates.imagePath ?? existing.previewImage,
    updatedAt: new Date().toISOString()
  }

  store[index] = updated
  await writeStore(store)
  return updated
}

async function setStayAvailability(
  id: string,
  blocks: AvailabilityBlock[]
): Promise<StayRecord | null> {
  const store = await readStore()
  const index = store.findIndex((stay) => stay.id === id)
  if (index === -1) return null

  const updated: StayRecord = {
    ...store[index],
    blocks: normalizeBlocks(blocks),
    availabilityUpdatedAt: new Date().toISOString()
  }

  store[index] = updated
  await writeStore(store)
  return updated
}

async function deleteStay(id: string): Promise<StayRecord | null> {
  const store = await readStore()
  const index = store.findIndex((stay) => stay.id === id)
  if (index === -1) return null

  const [deleted] = store.splice(index, 1)
  await writeStore(store)
  return deleted ?? null
}

export const kvStayRepository: StayRepository = {
  getStays,
  getStayById,
  createStay,
  updateStay,
  deleteStay,
  setStayAvailability
}
