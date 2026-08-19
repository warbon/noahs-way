import type { PackageCategory } from "@/lib/package-data"
import { filePackageRepository } from "@/lib/repositories/file-package-repository"
import { firestorePackageRepository } from "@/lib/repositories/firestore-package-repository"
import { kvPackageRepository } from "@/lib/repositories/kv-package-repository"
import type {
  CreatePackagePayload,
  PackageCatalogStore,
  PackageRecord,
  PackageRepository,
  UpdatePackagePayload
} from "@/lib/package-repository-types"

export type { PackageCatalogStore, PackageRecord } from "@/lib/package-repository-types"

function getRepositoryMode() {
  const value = process.env.PACKAGE_STORE?.trim().toLowerCase()

  if (value === "kv") return "kv"
  if (value === "firestore") return "firestore"
  return "file"
}

function getRepository(): PackageRepository {
  switch (getRepositoryMode()) {
    case "kv":
      return kvPackageRepository
    case "firestore":
      return firestorePackageRepository
    default:
      return filePackageRepository
  }
}

export async function getPackagesByCategory(category: PackageCategory) {
  return getRepository().getPackagesByCategory(category)
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
