import type {
  CreateInquiryPayload,
  InquiryRecord,
  InquiryRepository,
  UpdateInquiryPayload
} from "@/lib/inquiry-types"
import { appendActivitySafely, createActivityId } from "@/lib/activity-repository"
import { fileInquiryRepository } from "@/lib/repositories/file-inquiry-repository"
import { kvInquiryRepository } from "@/lib/repositories/kv-inquiry-repository"

export type { InquiryRecord, InquiryStatus } from "@/lib/inquiry-types"

function getRepository(): InquiryRepository {
  // Mirrors the package repository so both stores switch together.
  return process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv"
    ? kvInquiryRepository
    : fileInquiryRepository
}

export async function listInquiries(): Promise<InquiryRecord[]> {
  return getRepository().listInquiries()
}

export async function getInquiryById(id: string): Promise<InquiryRecord | null> {
  return getRepository().getInquiryById(id)
}

export async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord> {
  const inquiry = await getRepository().createInquiry(payload)
  await appendActivitySafely({
    id: `act-inquiry-received-${inquiry.id}`,
    entityType: "inquiry",
    entityId: inquiry.id,
    inquiryId: inquiry.id,
    productType: inquiry.stayId ? "stay" : inquiry.packageId ? "package" : undefined,
    customerName: inquiry.name,
    kind: "inquiry.received",
    summary: "Inquiry received",
    actor: "system",
    occurredAt: inquiry.createdAt
  })
  return inquiry
}

export async function updateInquiry(
  id: string,
  updates: UpdateInquiryPayload
): Promise<InquiryRecord | null> {
  const before = updates.status ? await getRepository().getInquiryById(id) : null
  const updated = await getRepository().updateInquiry(id, updates)
  if (updated && updates.status && before?.status !== updated.status) {
    await appendActivitySafely({
      id: createActivityId(),
      entityType: "inquiry",
      entityId: updated.id,
      inquiryId: updated.id,
      bookingId: updated.bookingId,
      productType: updated.stayId ? "stay" : updated.packageId ? "package" : undefined,
      customerName: updated.name,
      kind: "inquiry.status-changed",
      summary: `Inquiry changed from ${before?.status ?? "unknown"} to ${updated.status}`,
      actor: "admin",
      occurredAt: new Date().toISOString(),
      metadata: { from: before?.status ?? null, to: updated.status }
    })
  }
  return updated
}

export async function deleteInquiry(id: string): Promise<InquiryRecord | null> {
  return getRepository().deleteInquiry(id)
}
