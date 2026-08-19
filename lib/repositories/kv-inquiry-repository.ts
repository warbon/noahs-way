import { kv } from "@vercel/kv"

import {
  isInquiryRecord,
  type CreateInquiryPayload,
  type InquiryRecord,
  type InquiryRepository,
  type UpdateInquiryPayload
} from "@/lib/inquiry-types"

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
  const ids = await kv.lrange<string>(getIndexKey(), 0, -1)
  if (!ids || ids.length === 0) return []

  const records = await Promise.all(ids.map((id) => kv.get<unknown>(getRecordKey(id))))
  return records.filter(isInquiryRecord)
}

async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord> {
  const record: InquiryRecord = {
    ...payload,
    id: createUniqueId(),
    status: "new",
    createdAt: new Date().toISOString()
  }

  await kv.set(getRecordKey(record.id), record)
  await kv.lpush(getIndexKey(), record.id)

  return record
}

async function updateInquiry(
  id: string,
  updates: UpdateInquiryPayload
): Promise<InquiryRecord | null> {
  const existing = await kv.get<unknown>(getRecordKey(id))
  if (!isInquiryRecord(existing)) return null

  const updated: InquiryRecord = { ...existing, ...updates }
  await kv.set(getRecordKey(id), updated)

  return updated
}

async function deleteInquiry(id: string): Promise<InquiryRecord | null> {
  const existing = await kv.get<unknown>(getRecordKey(id))
  if (!isInquiryRecord(existing)) return null

  await kv.del(getRecordKey(id))
  await kv.lrem(getIndexKey(), 0, id)

  return existing
}

export const kvInquiryRepository: InquiryRepository = {
  listInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry
}
