import type { ItineraryDay, PackageCategory, PackageStatus } from "@/lib/package-data"

/** Shape the admin API returns for a single package. */
export type AdminPackageRecord = {
  id: string
  category: PackageCategory
  title: string
  details: string
  previewImage: string
  imagePath: string
  price: string
  slug?: string
  status?: PackageStatus
  destination?: string
  summary?: string
  priceAmount?: number
  currency?: string
  durationDays?: number
  durationNights?: number
  itinerary?: ItineraryDay[]
  inclusions?: string[]
  exclusions?: string[]
  imageAlt?: string
  updatedAt?: string
}

export type AdminPackageCatalog = Record<PackageCategory, AdminPackageRecord[]>
