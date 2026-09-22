import type { AvailabilityBlock, StayStatus } from "@/lib/stay-data"

/** Shape the admin API returns for a single condo unit. */
export type AdminStayRecord = {
  id: string
  title: string
  details: string
  previewImage: string
  imagePath: string
  nightlyRate: number
  currency?: string
  city: string
  bedrooms: number
  maxGuests: number
  slug?: string
  status?: StayStatus
  summary?: string
  minimumNights?: number
  cleaningFee?: number
  beds?: number
  baths?: number
  floorArea?: number
  building?: string
  landmark?: string
  amenities?: string[]
  houseRules?: string[]
  checkInTime?: string
  checkOutTime?: string
  gallery?: string[]
  imageAlt?: string
  blocks?: AvailabilityBlock[]
  availabilityUpdatedAt?: string
  createdAt?: string
  updatedAt?: string
}
