import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  isInquiryRecord,
  type CreateInquiryPayload,
  type InquiryRecord,
  type InquiryRepository,
  type UpdateInquiryPayload
} from "@/lib/inquiry-types"

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const INQUIRIES_JSON_PATH = path.join(DATA_DIR_PATH, "inquiries.json")

function createUniqueId() {
  return `inq-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Returns an empty list when the file is absent — a fresh checkout has no inquiries. */
async function readInquiries(): Promise<InquiryRecord[]> {
  try {
    const raw = await readFile(INQUIRIES_JSON_PATH, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isInquiryRecord)
  } catch {
    return []
  }
}

async function writeInquiries(inquiries: InquiryRecord[]) {
  await mkdir(DATA_DIR_PATH, { recursive: true })
  await writeFile(INQUIRIES_JSON_PATH, `${JSON.stringify(inquiries, null, 2)}\n`, "utf8")
}

async function listInquiries(): Promise<InquiryRecord[]> {
  return readInquiries()
}

async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord> {
  const inquiries = await readInquiries()
  const record: InquiryRecord = {
    ...payload,
    id: createUniqueId(),
    status: "new",
    createdAt: new Date().toISOString()
  }

  await writeInquiries([record, ...inquiries])
  return record
}

async function updateInquiry(
  id: string,
  updates: UpdateInquiryPayload
): Promise<InquiryRecord | null> {
  const inquiries = await readInquiries()
  const index = inquiries.findIndex((inquiry) => inquiry.id === id)
  if (index === -1) return null

  const updated: InquiryRecord = { ...inquiries[index], ...updates }
  inquiries[index] = updated
  await writeInquiries(inquiries)

  return updated
}

async function deleteInquiry(id: string): Promise<InquiryRecord | null> {
  const inquiries = await readInquiries()
  const index = inquiries.findIndex((inquiry) => inquiry.id === id)
  if (index === -1) return null

  const [deleted] = inquiries.splice(index, 1)
  await writeInquiries(inquiries)

  return deleted ?? null
}

export const fileInquiryRepository: InquiryRepository = {
  listInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry
}
