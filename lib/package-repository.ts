import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  packageCatalog as seedCatalog,
  type PackageCategory,
  type TravelPackage
} from "@/lib/package-data"

export type PackageRecord = TravelPackage & {
  id: string
}

type PackageCatalogStore = Record<PackageCategory, PackageRecord[]>

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const PACKAGES_JSON_PATH = path.join(DATA_DIR_PATH, "packages.json")

function cloneSeedCatalog(): PackageCatalogStore {
  return {
    local: seedCatalog.local.map((pkg, index) => ({
      ...pkg,
      id: createPackageId("local", pkg.title, index)
    })),
    international: seedCatalog.international.map((pkg, index) => ({
      ...pkg,
      id: createPackageId("international", pkg.title, index)
    }))
  }
}

function isValidPackageCategory(value: unknown): value is PackageCategory {
  return value === "local" || value === "international"
}

function isValidTravelPackage(value: unknown): value is TravelPackage {
  if (!value || typeof value !== "object") return false

  const pkg = value as Record<string, unknown>
  return (
    isValidPackageCategory(pkg.category) &&
    typeof pkg.title === "string" &&
    typeof pkg.details === "string" &&
    typeof pkg.previewImage === "string" &&
    typeof pkg.imagePath === "string" &&
    typeof pkg.price === "string"
  )
}

function createPackageId(category: PackageCategory, title: string, index: number) {
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "package"

  return `${category}-${titleSlug}-${index + 1}`
}

function createUniqueId() {
  return `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizePackageRecord(
  value: unknown,
  category: PackageCategory,
  index: number
): PackageRecord | null {
  if (!isValidTravelPackage(value)) return null

  const record = value as TravelPackage & { id?: unknown }
  const id =
    typeof record.id === "string" && record.id.trim() ? record.id.trim() : createPackageId(category, record.title, index)

  return {
    ...record,
    category,
    id
  }
}

function normalizeCatalogStore(value: unknown): { catalog: PackageCatalogStore; mutated: boolean } | null {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  const local = record.local
  const international = record.international

  if (!Array.isArray(local) || !Array.isArray(international)) return null

  const normalizedLocal = local
    .map((pkg, index) => normalizePackageRecord(pkg, "local", index))
    .filter((pkg): pkg is PackageRecord => pkg !== null)
  const normalizedInternational = international
    .map((pkg, index) => normalizePackageRecord(pkg, "international", index))
    .filter((pkg): pkg is PackageRecord => pkg !== null)

  if (normalizedLocal.length !== local.length || normalizedInternational.length !== international.length) {
    return null
  }

  const hasMissingIds =
    local.some((pkg) => !(pkg && typeof pkg === "object" && typeof (pkg as { id?: unknown }).id === "string")) ||
    international.some((pkg) => !(pkg && typeof pkg === "object" && typeof (pkg as { id?: unknown }).id === "string"))

  return {
    catalog: {
      local: normalizedLocal,
      international: normalizedInternational
    },
    mutated: hasMissingIds
  }
}

async function ensureDataDir() {
  await mkdir(DATA_DIR_PATH, { recursive: true })
}

async function writeCatalogStore(catalog: PackageCatalogStore) {
  await ensureDataDir()
  await writeFile(PACKAGES_JSON_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8")
}

export async function getPackageCatalogStore() {
  try {
    const raw = await readFile(PACKAGES_JSON_PATH, "utf8")
    const parsed = JSON.parse(raw) as unknown
    const normalized = normalizeCatalogStore(parsed)

    if (normalized) {
      if (normalized.mutated) {
        await writeCatalogStore(normalized.catalog)
      }

      return normalized.catalog
    }
  } catch {
    // Seed below if file is missing or invalid.
  }

  const seededCatalog = cloneSeedCatalog()
  await writeCatalogStore(seededCatalog)
  return seededCatalog
}

export async function getPackagesByCategory(category: PackageCategory) {
  const catalog = await getPackageCatalogStore()
  return catalog[category]
}

export async function getAllPackagesForAdmin() {
  return getPackageCatalogStore()
}

export async function createPackageRecord(
  payload: Omit<TravelPackage, "previewImage" | "imagePath"> & { imagePath: string; previewImage?: string }
) {
  const catalog = await getPackageCatalogStore()
  const newPackage: PackageRecord = {
    ...payload,
    id: createUniqueId(),
    previewImage: payload.previewImage ?? payload.imagePath
  }

  catalog[payload.category] = [newPackage, ...catalog[payload.category]]
  await writeCatalogStore(catalog)

  return newPackage
}

type PackageEditableFields = Pick<
  TravelPackage,
  "category" | "title" | "details" | "price" | "imagePath" | "previewImage"
>

export async function updatePackageRecord(
  id: string,
  updates: Partial<PackageEditableFields>
): Promise<PackageRecord | null> {
  const catalog = await getPackageCatalogStore()

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

    await writeCatalogStore(catalog)
    return updatedPackage
  }

  return null
}

export async function deletePackageRecord(id: string): Promise<PackageRecord | null> {
  const catalog = await getPackageCatalogStore()

  for (const category of ["local", "international"] as const) {
    const list = catalog[category]
    const index = list.findIndex((pkg) => pkg.id === id)

    if (index === -1) continue

    const [deleted] = list.splice(index, 1)
    await writeCatalogStore(catalog)
    return deleted ?? null
  }

  return null
}

export async function ensurePackageImageDirectory(category: PackageCategory) {
  const dirPath = path.join(process.cwd(), "public", "images", "packages", category)
  await mkdir(dirPath, { recursive: true })
  return dirPath
}
