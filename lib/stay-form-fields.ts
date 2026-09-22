import { parseLines, parseOptionalNumber, parseOptionalText } from "@/lib/package-form-fields"
import type { StayStatus, StayUnit } from "@/lib/stay-data"

/**
 * Form parsing for condo listings.
 *
 * The line-list and number readers are reused from the package form rather
 * than reimplemented — an admin who has learned that one item per line means
 * one entry should not find the rule different on another screen.
 */

export function parseStayStatus(value: unknown): StayStatus | undefined {
  return value === "draft" || value === "published" ? value : undefined
}

/**
 * A count that has to be a whole number, e.g. bedrooms or guests. Rejects
 * negatives and absurd values rather than storing them.
 */
export function parseCount(value: unknown, max = 99): number | undefined {
  const parsed = parseOptionalNumber(value)
  if (parsed === undefined) return undefined
  const rounded = Math.round(parsed)
  if (rounded < 0 || rounded > max) return undefined
  return rounded
}

/** A money amount. Zero is meaningful (a waived cleaning fee), negatives are not. */
export function parseAmount(value: unknown): number | undefined {
  const parsed = parseOptionalNumber(value)
  if (parsed === undefined || parsed < 0) return undefined
  return parsed
}

type StayOptionalFields = Pick<
  StayUnit,
  | "status"
  | "summary"
  | "currency"
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
  | "imageAlt"
>

/**
 * Reads the optional fields off a submitted form.
 *
 * Same contract as the package form: a missing or blank field is omitted, so a
 * partial update cannot wipe stored values, unless the form sends
 * `manageStructured=1` to declare it rendered all of them — at which point a
 * blank means "clear this". `status` is exempt either way, because an absent
 * status has to mean "leave it as it is" rather than "unpublish".
 */
export function readStayOptionalFields(formData: FormData): StayOptionalFields {
  const managesAll = formData.get("manageStructured") === "1"

  const fields: StayOptionalFields = {
    status: parseStayStatus(formData.get("status")),
    summary: parseOptionalText(formData.get("summary")),
    currency: parseOptionalText(formData.get("currency")),
    minimumNights: parseCount(formData.get("minimumNights"), 365),
    cleaningFee: parseAmount(formData.get("cleaningFee")),
    beds: parseCount(formData.get("beds")),
    baths: parseCount(formData.get("baths")),
    floorArea: parseAmount(formData.get("floorArea")),
    building: parseOptionalText(formData.get("building")),
    landmark: parseOptionalText(formData.get("landmark")),
    amenities: parseLines(formData.get("amenities")),
    houseRules: parseLines(formData.get("houseRules")),
    checkInTime: parseOptionalText(formData.get("checkInTime")),
    checkOutTime: parseOptionalText(formData.get("checkOutTime")),
    imageAlt: parseOptionalText(formData.get("imageAlt"))
  }

  if (managesAll) {
    return Object.fromEntries(
      Object.entries(fields).filter(([key]) => key !== "status" || fields.status !== undefined)
    ) as StayOptionalFields
  }

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  ) as StayOptionalFields
}
