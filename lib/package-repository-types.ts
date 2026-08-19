import type { PackageCategory, TravelPackage } from "@/lib/package-data"

export type PackageRecord = TravelPackage & {
  id: string
}

export type PackageCatalogStore = Record<PackageCategory, PackageRecord[]>

type PackageEditableFields = Pick<
  TravelPackage,
  "category" | "title" | "details" | "price" | "imagePath" | "previewImage"
>

export type CreatePackagePayload = Omit<TravelPackage, "previewImage" | "imagePath"> & {
  imagePath: string
  previewImage?: string
}

export type UpdatePackagePayload = Partial<PackageEditableFields>

export type PackageRepository = {
  getPackagesByCategory(category: PackageCategory): Promise<PackageRecord[]>
  getAllPackagesForAdmin(): Promise<PackageCatalogStore>
  createPackageRecord(payload: CreatePackagePayload): Promise<PackageRecord>
  updatePackageRecord(id: string, updates: UpdatePackagePayload): Promise<PackageRecord | null>
  deletePackageRecord(id: string): Promise<PackageRecord | null>
}

