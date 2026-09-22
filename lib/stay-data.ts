/**
 * Condo stays — the short-stay rental side of the business.
 *
 * Deliberately a separate model from `TravelPackage` rather than a third
 * package category. A tour has a fixed length the operator sets, a day-by-day
 * itinerary and per-person fees; a condo has a nightly rate, a length the guest
 * chooses, and a capacity. Sharing one type would have meant every unit
 * carrying `itinerary` and `travelPeriods` it can never use, and every branch
 * in the detail view asking which kind of thing it was rendering.
 */

export type StayStatus = "published" | "draft"

/**
 * A range of nights that cannot be booked, half-open: `from` is the first
 * blocked night, `to` is the morning the unit frees up again.
 *
 * Half-open is what makes back-to-back bookings work. A guest checking out on
 * the 5th and one checking in on the 5th do not collide, because nobody sleeps
 * there on the night of the 5th under the first booking.
 *
 * Both dates are plain `YYYY-MM-DD` strings in Philippine local time, never
 * `Date` objects. A `Date` is an instant, and an instant renders as a different
 * calendar day either side of midnight UTC — which is 8am in Manila, so a
 * guest browsing in the morning would see the wrong day blocked.
 */
export type AvailabilityBlock = {
  from: string
  to: string
  /** Why it is blocked — "Booked", "Owner use", "Maintenance". Admin-only. */
  note?: string
}

export type StayUnit = {
  title: string
  /** One-line card subtitle, e.g. "1BR • 2 guests • Cebu Business Park". */
  details: string
  previewImage: string
  imagePath: string

  /** Per night, in `currency`. The guest picks the number of nights. */
  nightlyRate: number
  currency?: string

  city: string
  bedrooms: number
  maxGuests: number

  slug?: string
  /** Absent means published, matching the package catalog's convention. */
  status?: StayStatus
  summary?: string

  minimumNights?: number
  /** Charged once per booking, not per night. */
  cleaningFee?: number

  beds?: number
  baths?: number
  /** Floor area in square metres. */
  floorArea?: number

  building?: string
  /** What the location is near, in the terms a guest would recognise. */
  landmark?: string

  amenities?: string[]
  houseRules?: string[]

  /** Displayed as written, e.g. "2:00 PM". Not parsed. */
  checkInTime?: string
  checkOutTime?: string

  /** Additional photos beyond the cover image. */
  gallery?: string[]
  imageAlt?: string

  blocks?: AvailabilityBlock[]
  /**
   * When the blocked dates were last touched.
   *
   * Shown to the guest beside the calendar. An availability calendar nobody has
   * updated in two months is worse than none at all, because it looks
   * authoritative — the stamp is what makes staleness visible instead of
   * silent.
   */
  availabilityUpdatedAt?: string

  createdAt?: string
  updatedAt?: string
}

export const STAY_PAGE_SIZE = 9

/**
 * Cover photo plus this many more. Each extra photo is a separate object in the
 * image store and another request on the unit's page, so the cap is a real
 * limit rather than a formality.
 *
 * These live here, beside the types, rather than next to the upload code: the
 * admin form needs them to show "3 of 9" and to stop offering a picker at the
 * limit, and importing them from the upload module would drag `node:fs` into
 * the browser bundle.
 */
export const MAX_GALLERY_PHOTOS = 9

export const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
}

export const stayMeta = {
  title: "Condo Stays",
  shortLabel: "Stays",
  description:
    "Fully furnished condo units for short stays — nightly rates, straight from the owner, with the fees listed up front."
} as const

/** Amenity suggestions offered in the admin form. Free text is still allowed. */
export const COMMON_AMENITIES = [
  "Air conditioning",
  "Wi-Fi",
  "Smart TV",
  "Kitchen",
  "Refrigerator",
  "Microwave",
  "Washing machine",
  "Hot shower",
  "Work desk",
  "Elevator",
  "Swimming pool",
  "Gym",
  "24/7 security",
  "Parking",
  "Balcony"
] as const
