import { fileStayRepository } from "@/lib/repositories/file-stay-repository"
import { kvStayRepository } from "@/lib/repositories/kv-stay-repository"
import type { AvailabilityBlock } from "@/lib/stay-data"
import type {
  CreateStayPayload,
  GetStaysOptions,
  StayRecord,
  StayRepository,
  UpdateStayPayload
} from "@/lib/stay-repository-types"

export type { StayRecord } from "@/lib/stay-repository-types"

let warnedAboutFileStore = false

/**
 * `STAY_STORE` when it is set, otherwise whatever `PACKAGE_STORE` says.
 *
 * Falling back to the package setting is what keeps a deployment from ending
 * up half-migrated — the common case is one site on one backend, and an owner
 * who moves packages to KV should not discover months later that condo
 * listings were still being written to a file nobody reads. `STAY_STORE`
 * exists for the uncommon case where they genuinely need to differ.
 */
function getRepositoryMode() {
  const value = (process.env.STAY_STORE ?? process.env.PACKAGE_STORE)?.trim().toLowerCase()

  if (value === "kv") return "kv"

  // Same trap the package store warns about: the file backend writes to
  // data/stays.json under the working directory, which is read-only on a
  // serverless host. A save there fails silently rather than loudly, and for
  // stays that also means the availability calendar can never be updated.
  if (process.env.NODE_ENV === "production" && !warnedAboutFileStore) {
    warnedAboutFileStore = true
    console.warn(
      "[stays] Neither STAY_STORE nor PACKAGE_STORE is set to \"kv\", so the file backend " +
        "is active. It writes to data/stays.json, which is read-only on a serverless host — " +
        "saving a unit and blocking dates will both fail. Set PACKAGE_STORE=kv and link a KV store."
    )
  }

  return "file"
}

function getRepository(): StayRepository {
  return getRepositoryMode() === "kv" ? kvStayRepository : fileStayRepository
}

export async function getStays(options?: GetStaysOptions): Promise<StayRecord[]> {
  return getRepository().getStays(options)
}

export async function getStayById(id: string): Promise<StayRecord | null> {
  return getRepository().getStayById(id)
}

export async function createStay(payload: CreateStayPayload): Promise<StayRecord> {
  return getRepository().createStay(payload)
}

export async function updateStay(
  id: string,
  updates: UpdateStayPayload
): Promise<StayRecord | null> {
  return getRepository().updateStay(id, updates)
}

export async function deleteStay(id: string): Promise<StayRecord | null> {
  return getRepository().deleteStay(id)
}

export async function setStayAvailability(
  id: string,
  blocks: AvailabilityBlock[]
): Promise<StayRecord | null> {
  return getRepository().setStayAvailability(id, blocks)
}
