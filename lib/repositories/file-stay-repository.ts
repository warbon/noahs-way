import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { normalizeBlocks } from "@/lib/stay-availability"
import type { AvailabilityBlock, StayUnit } from "@/lib/stay-data"
import type {
  CreateStayPayload,
  GetStaysOptions,
  StayRecord,
  StayRepository,
  StayStore,
  UpdateStayPayload
} from "@/lib/stay-repository-types"

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const STAYS_JSON_PATH = path.join(DATA_DIR_PATH, "stays.json")

/**
 * A missing or unreadable store yields an empty list, not sample data.
 *
 * The package repository seeds itself from a fixture, which is harmless for
 * illustrative trips. A condo listing is a specific unit at a specific address
 * with a price attached — inventing three of them would put fictional
 * accommodation in front of customers, and on a fresh deployment nobody would
 * necessarily notice before it was indexed.
 */
function emptyStore(): StayStore {
  return []
}

function createUniqueId() {
  return `stay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isValidStay(value: unknown): value is StayUnit {
  if (!value || typeof value !== "object") return false

  const stay = value as Record<string, unknown>
  return (
    typeof stay.title === "string" &&
    typeof stay.details === "string" &&
    typeof stay.previewImage === "string" &&
    typeof stay.imagePath === "string" &&
    typeof stay.nightlyRate === "number" &&
    Number.isFinite(stay.nightlyRate) &&
    typeof stay.city === "string" &&
    typeof stay.bedrooms === "number" &&
    typeof stay.maxGuests === "number"
  )
}

function normalizeStayRecord(value: unknown, index: number): StayRecord | null {
  if (!isValidStay(value)) return null

  const record = value as StayUnit & { id?: unknown }
  const id =
    typeof record.id === "string" && record.id.trim()
      ? record.id.trim()
      : `stay-${index + 1}`

  return { ...record, id, blocks: normalizeBlocks(record.blocks) }
}

async function ensureDataDir() {
  await mkdir(DATA_DIR_PATH, { recursive: true })
}

async function writeStore(store: StayStore) {
  await ensureDataDir()
  await writeFile(STAYS_JSON_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8")
}

async function readStore(): Promise<StayStore> {
  try {
    const raw = await readFile(STAYS_JSON_PATH, "utf8")
    const parsed = JSON.parse(raw) as unknown

    if (Array.isArray(parsed)) {
      return parsed
        .map((stay, index) => normalizeStayRecord(stay, index))
        .filter((stay): stay is StayRecord => stay !== null)
    }
  } catch {
    // Missing or unreadable file: fall through to an empty store.
  }

  return emptyStore()
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
    // Stamped here rather than taken from the payload, so it records when the
    // record was actually stored and cannot be back-dated by a caller.
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

export const fileStayRepository: StayRepository = {
  getStays,
  getStayById,
  createStay,
  updateStay,
  deleteStay,
  setStayAvailability
}
