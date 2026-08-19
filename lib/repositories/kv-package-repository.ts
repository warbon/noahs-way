import { kv } from "@vercel/kv"

import type { PackageCategory } from "@/lib/package-data"
import type {
  CreatePackagePayload,
  PackageCatalogStore,
  PackageRecord,
  PackageRepository,
  UpdatePackagePayload
} from "@/lib/package-repository-types"

const DEFAULT_CATALOG_KEY = "packages:catalog"

function getCatalogKey() {
  return process.env.PACKAGE_CATALOG_KV_KEY?.trim() || DEFAULT_CATALOG_KEY
}

function createUniqueId() {
  return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isPackageCategory(value: unknown): value is PackageCategory {
  return value === "local" || value === "international"
}

function isPackageRecord(value: unknown): value is PackageRecord {
  if (!value || typeof value !== "object") return false

  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    isPackageCategory(record.category) &&
    typeof record.title === "string" &&
    typeof record.details === "string" &&
    typeof record.previewImage === "string" &&
    typeof record.imagePath === "string" &&
    typeof record.price === "string"
  )
}

function emptyCatalog(): PackageCatalogStore {
  return { local: [], international: [] }
}

/**
 * Reads the whole catalog from a single KV key. Returns an empty catalog when
 * the key is absent so a fresh deployment starts clean; run `npm run seed:kv`
 * to load `data/packages.json` into the store.
 */
async function readCatalog(): Promise<PackageCatalogStore> {
  // @vercel/kv deserializes JSON automatically.
  const raw = await kv.get<unknown>(getCatalogKey())

  if (!raw || typeof raw !== "object") return emptyCatalog()

  const record = raw as Record<string, unknown>
  const local = Array.isArray(record.local) ? record.local.filter(isPackageRecord) : []
  const international = Array.isArray(record.international)
    ? record.international.filter(isPackageRecord)
    : []

  return { local, international }
}

async function writeCatalog(catalog: PackageCatalogStore) {
  await kv.set(getCatalogKey(), catalog)
}

async function getPackagesByCategory(category: PackageCategory): Promise<PackageRecord[]> {
  const catalog = await readCatalog()
  return catalog[category]
}

async function getAllPackagesForAdmin(): Promise<PackageCatalogStore> {
  return readCatalog()
}

async function createPackageRecord(payload: CreatePackagePayload): Promise<PackageRecord> {
  const catalog = await readCatalog()
  const newPackage: PackageRecord = {
    ...payload,
    id: createUniqueId(),
    previewImage: payload.previewImage ?? payload.imagePath
  }

  catalog[payload.category] = [newPackage, ...catalog[payload.category]]
  await writeCatalog(catalog)

  return newPackage
}

async function updatePackageRecord(
  id: string,
  updates: UpdatePackagePayload
): Promise<PackageRecord | null> {
  const catalog = await readCatalog()

  for (const sourceCategory of ["local", "international"] as const) {
    const sourceList = catalog[sourceCategory]
    const sourceIndex = sourceList.findIndex((pkg) => pkg.id === id)

    if (sourceIndex === -1) continue

    const existing = sourceList[sourceIndex]
    const targetCategory = updates.category ?? existing.category
    const updatedPackage: PackageRecord = {
      ...existing,
      ...updates,
      category: targetCategory,
      id: existing.id,
      imagePath: updates.imagePath ?? existing.imagePath,
      previewImage: updates.previewImage ?? updates.imagePath ?? existing.previewImage
    }

    sourceList.splice(sourceIndex, 1)
    catalog[targetCategory] = [updatedPackage, ...catalog[targetCategory]]

    await writeCatalog(catalog)
    return updatedPackage
  }

  return null
}

async function deletePackageRecord(id: string): Promise<PackageRecord | null> {
  const catalog = await readCatalog()

  for (const category of ["local", "international"] as const) {
    const list = catalog[category]
    const index = list.findIndex((pkg) => pkg.id === id)

    if (index === -1) continue

    const [deleted] = list.splice(index, 1)
    await writeCatalog(catalog)
    return deleted ?? null
  }

  return null
}

export const kvPackageRepository: PackageRepository = {
  getPackagesByCategory,
  getAllPackagesForAdmin,
  createPackageRecord,
  updatePackageRecord,
  deletePackageRecord
}
