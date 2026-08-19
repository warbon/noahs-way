import type {
  CreateInquiryPayload,
  InquiryRecord,
  InquiryRepository,
  UpdateInquiryPayload
} from "@/lib/inquiry-types"
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

export async function createInquiry(payload: CreateInquiryPayload): Promise<InquiryRecord> {
  return getRepository().createInquiry(payload)
}

export async function updateInquiry(
  id: string,
  updates: UpdateInquiryPayload
): Promise<InquiryRecord | null> {
  return getRepository().updateInquiry(id, updates)
}

export async function deleteInquiry(id: string): Promise<InquiryRecord | null> {
  return getRepository().deleteInquiry(id)
}
