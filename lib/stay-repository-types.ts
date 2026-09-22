import type { AvailabilityBlock, StayUnit } from "@/lib/stay-data"

export type StayRecord = StayUnit & {
  id: string
}

/**
 * A flat list, unlike the package catalog's category map. Stays have no
 * equivalent of local/international to split on, and inventing one to mirror
 * the package store would only mean a key to keep in sync for no gain.
 */
export type StayStore = StayRecord[]

type StayEditableFields = Pick<
  StayUnit,
  | "title"
  | "details"
  | "previewImage"
  | "imagePath"
  | "nightlyRate"
  | "currency"
  | "city"
  | "bedrooms"
  | "maxGuests"
  | "slug"
  | "status"
  | "summary"
  | "minimumNights"
  | "cleaningFee"
  | "beds"
  | "baths"
  | "floorArea"
  | "building"
  | "landmark"
  | "amenities"
  | "houseRules"
  | "checkInTime"
  | "checkOutTime"
  | "gallery"
  | "imageAlt"
>

export type CreateStayPayload = Omit<StayUnit, "previewImage" | "imagePath"> & {
  imagePath: string
  previewImage?: string
}

export type UpdateStayPayload = Partial<StayEditableFields>

export type GetStaysOptions = {
  /** Admin views pass true; the public site never shows drafts. */
  includeDrafts?: boolean
}

export type StayRepository = {
  getStays(options?: GetStaysOptions): Promise<StayRecord[]>
  getStayById(id: string): Promise<StayRecord | null>
  createStay(payload: CreateStayPayload): Promise<StayRecord>
  updateStay(id: string, updates: UpdateStayPayload): Promise<StayRecord | null>
  deleteStay(id: string): Promise<StayRecord | null>
  /**
   * Availability is updated on its own path rather than through `updateStay`.
   *
   * Blocking dates is a different job from editing a listing — it happens far
   * more often, from a different screen, and usually while a guest is waiting.
   * Routing it through the same payload would mean every calendar change had
   * to carry, and risk clobbering, the whole record.
   */
  setStayAvailability(id: string, blocks: AvailabilityBlock[]): Promise<StayRecord | null>
}
