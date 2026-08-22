import type { PackageCategory } from "@/lib/package-data"
import { filePackageRepository } from "@/lib/repositories/file-package-repository"
import { kvPackageRepository } from "@/lib/repositories/kv-package-repository"
import type {
  CreatePackagePayload,
  GetPackagesOptions,
  PackageCatalogStore,
  PackageRecord,
  PackageRepository,
  UpdatePackagePayload
} from "@/lib/package-repository-types"

export type { PackageCatalogStore, PackageRecord } from "@/lib/package-repository-types"

/**
 * Warned once per process, not per call, so a busy admin session does not
 * bury the message in repeats.
 */
let warnedAboutFileStore = false

function getRepositoryMode() {
  const value = process.env.PACKAGE_STORE?.trim().toLowerCase()

  if (value === "kv") return "kv"

  // The file backend writes to data/packages.json under the working directory,
  // which is read-only on a serverless host. Saving cannot work there, and the
  // symptom is a save that appears to do nothing rather than an obvious error,
  // so the deployment says so up front instead of waiting to be discovered.
  if (process.env.NODE_ENV === "production" && !warnedAboutFileStore) {
    warnedAboutFileStore = true
    console.warn(
      "[packages] PACKAGE_STORE is not set to \"kv\", so the file backend is active. " +
        "It writes to data/packages.json, which is read-only on a serverless host — " +
        "every save from the admin panel will fail. Set PACKAGE_STORE=kv and link a KV store."
    )
  }

  return "file"
}

function getRepository(): PackageRepository {
  return getRepositoryMode() === "kv" ? kvPackageRepository : filePackageRepository
}

export async function getPackagesByCategory(
  category: PackageCategory,
  options?: GetPackagesOptions
) {
  return getRepository().getPackagesByCategory(category, options)
}

export async function getAllPackagesForAdmin(): Promise<PackageCatalogStore> {
  return getRepository().getAllPackagesForAdmin()
}

export async function createPackageRecord(payload: CreatePackagePayload): Promise<PackageRecord> {
  return getRepository().createPackageRecord(payload)
}

export async function updatePackageRecord(
  id: string,
  updates: UpdatePackagePayload
): Promise<PackageRecord | null> {
  return getRepository().updatePackageRecord(id, updates)
}

export async function deletePackageRecord(id: string): Promise<PackageRecord | null> {
  return getRepository().deletePackageRecord(id)
}
