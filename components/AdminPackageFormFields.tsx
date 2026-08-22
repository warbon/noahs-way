"use client"

import AdminPosterField from "@/components/AdminPosterField"
import AdminPosterReader from "@/components/AdminPosterReader"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminPackageRecord } from "@/lib/admin-package-types"

type Props = {
  /** Present when editing; absent when creating. */
  pkg?: AdminPackageRecord | null
  disabled?: boolean
}

const fieldClass = "space-y-1.5"
const labelClass = "text-sm font-medium text-foreground"
const hintClass = "text-xs text-muted-foreground"

function linesOf(values?: string[]) {
  return values?.join("\n") ?? ""
}

function feesText(pkg?: AdminPackageRecord | null) {
  if (!pkg?.fees?.length) return ""
  return pkg.fees
    .map((fee) =>
      [
        fee.label,
        fee.amount ?? "",
        fee.amount ? fee.currency ?? "PHP" : "",
        fee.basis,
        fee.required ? "yes" : "no",
        fee.note ?? ""
      ]
        .join(" | ")
        .replace(/\s*\|\s*$/, "")
    )
    .join("\n")
}

function itineraryText(pkg?: AdminPackageRecord | null) {
  if (!pkg?.itinerary?.length) return ""
  return pkg.itinerary
    .map((day) => `Day ${day.day} | ${day.title}${day.activities?.length ? ` | ${day.activities.join("; ")}` : ""}`)
    .join("\n")
}

/**
 * Every field for a package, shared by the create and edit panels so the two
 * can't drift. Values are uncontrolled with `defaultValue` — the panel remounts
 * this component per package (keyed by id), which resets the inputs.
 */
export default function AdminPackageFormFields({ pkg, disabled }: Props) {
  const isEditing = Boolean(pkg)

  return (
    <div className="space-y-6">
      {/* Editing sends this so blank fields clear the stored value instead of
          being silently ignored. */}
      {isEditing ? <input type="hidden" name="manageStructured" value="1" /> : null}

      {/* First, because "Read poster" fills everything below it from this file. */}
      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Poster
        </legend>

        <AdminPosterField existingImage={pkg?.previewImage} isEditing={isEditing} />

        <AdminPosterReader disabled={disabled} />

        <div className={fieldClass}>
          <label htmlFor="imageAlt" className={labelClass}>
            Image alt text
          </label>
          <Input
            id="imageAlt"
            name="imageAlt"
            defaultValue={pkg?.imageAlt ?? ""}
            placeholder="Nami Island & Seoul tour poster"
          />
          <p className={hintClass}>Describes the poster for screen readers and search engines.</p>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Basics
        </legend>

        <div className={fieldClass}>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <Input id="title" name="title" defaultValue={pkg?.title ?? ""} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select
              id="category"
              name="category"
              defaultValue={pkg?.category ?? "local"}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
          </div>

          <div className={fieldClass}>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={pkg?.status ?? "published"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="published">Published</option>
              <option value="draft">Draft — hidden from the website</option>
            </select>
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="details" className={labelClass}>
            Card summary line
          </label>
          <Textarea
            id="details"
            name="details"
            rows={2}
            defaultValue={pkg?.details ?? ""}
            placeholder="4 Days / 3 Nights • Beachfront resort • Island hopping"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="price" className={labelClass}>
              Price label
            </label>
            <Input
              id="price"
              name="price"
              defaultValue={pkg?.price ?? ""}
              placeholder="from PHP 24,900"
              required
            />
          </div>

          <div className={fieldClass}>
            <label htmlFor="priceAmount" className={labelClass}>
              Price amount
            </label>
            <Input
              id="priceAmount"
              name="priceAmount"
              inputMode="numeric"
              defaultValue={pkg?.priceAmount ?? ""}
              placeholder="24900"
            />
            <p className={hintClass}>Numeric, for sorting and search engines.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className={fieldClass}>
            <label htmlFor="destination" className={labelClass}>
              Destination
            </label>
            <Input
              id="destination"
              name="destination"
              defaultValue={pkg?.destination ?? ""}
              placeholder="Seoul, South Korea"
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="durationDays" className={labelClass}>
              Days
            </label>
            <Input
              id="durationDays"
              name="durationDays"
              inputMode="numeric"
              defaultValue={pkg?.durationDays ?? ""}
            />
          </div>
          <div className={fieldClass}>
            <label htmlFor="durationNights" className={labelClass}>
              Nights
            </label>
            <Input
              id="durationNights"
              name="durationNights"
              inputMode="numeric"
              defaultValue={pkg?.durationNights ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={disabled}>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Package page content
        </legend>

        <div className={fieldClass}>
          <label htmlFor="summary" className={labelClass}>
            Summary
          </label>
          <Textarea id="summary" name="summary" rows={2} defaultValue={pkg?.summary ?? ""} />
          <p className={hintClass}>Shown under the title on the package page.</p>
        </div>

        <div className={fieldClass}>
          <label htmlFor="itinerary" className={labelClass}>
            Itinerary
          </label>
          <Textarea
            id="itinerary"
            name="itinerary"
            rows={5}
            defaultValue={itineraryText(pkg)}
            placeholder={"Day 1 | Arrival in Incheon | Airport pickup; hotel check-in\nDay 2 | Seoul highlights | Gyeongbok Palace; Hongdae"}
          />
          <p className={hintClass}>
            One day per line: <code>Day 1 | Title | Activity; Activity</code>. This is what makes the
            package readable on phones and findable on Google.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="travelPeriods" className={labelClass}>
              Travel periods
            </label>
            <Textarea
              id="travelPeriods"
              name="travelPeriods"
              rows={4}
              defaultValue={linesOf(pkg?.travelPeriods)}
              placeholder={"Mar 04–08\nMar 18–22 (+₱5,000/pax)"}
            />
            <p className={hintClass}>
              One departure window per line, copied from the poster. Add any surcharge in
              brackets.
            </p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="highlights" className={labelClass}>
              Highlights
            </label>
            <Textarea
              id="highlights"
              name="highlights"
              rows={4}
              defaultValue={linesOf(pkg?.highlights)}
              placeholder={"Fansipan Summit two-way cable car\nHoi An Ancient Town"}
            />
            <p className={hintClass}>
              One per line. The booking assistant uses these when matching a trip to what a
              customer asks for.
            </p>
          </div>
        </div>

        <div className={fieldClass}>
          <label htmlFor="fees" className={labelClass}>
            Fees outside the package price
          </label>
          <Textarea
            id="fees"
            name="fees"
            rows={5}
            defaultValue={feesText(pkg)}
            placeholder={"Philippine travel tax | 1620 | PHP | per-person | yes | Paid at the airport\nCheck-in baggage 20kg | 1700 | PHP | per-person-per-way | no\nVisa fee | | | per-person | no | Subject to quotation"}
          />
          <p className={hintClass}>
            One per line: <code>Label | amount | PHP or USD | basis | yes or no | note</code>.
            Basis is <code>per-person</code>, <code>per-person-per-way</code>,{" "}
            <code>per-person-per-day</code> or <code>per-booking</code>. Leave the amount blank
            when it is not known — the fee is still listed, just not added up. This is what the
            trip cost estimate on the package page uses.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={fieldClass}>
            <label htmlFor="inclusions" className={labelClass}>
              Inclusions
            </label>
            <Textarea
              id="inclusions"
              name="inclusions"
              rows={4}
              defaultValue={linesOf(pkg?.inclusions)}
            />
            <p className={hintClass}>One per line.</p>
          </div>
          <div className={fieldClass}>
            <label htmlFor="exclusions" className={labelClass}>
              Exclusions
            </label>
            <Textarea
              id="exclusions"
              name="exclusions"
              rows={4}
              defaultValue={linesOf(pkg?.exclusions)}
            />
            <p className={hintClass}>One per line.</p>
          </div>
        </div>
      </fieldset>

    </div>
  )
}
