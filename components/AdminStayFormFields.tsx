"use client"

import AdminGalleryField from "@/components/AdminGalleryField"
import AdminPosterField from "@/components/AdminPosterField"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { COMMON_AMENITIES } from "@/lib/stay-data"
import type { AdminStayRecord } from "@/lib/admin-stay-types"

type Props = {
  editing: AdminStayRecord | null
}

const labelClass = "text-sm font-medium text-foreground"
const hintClass = "text-xs text-muted-foreground"

function Field({
  name,
  label,
  hint,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
  min,
  step
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string | number
  type?: string
  required?: boolean
  placeholder?: string
  min?: string
  step?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`stay-${name}`} className={labelClass}>
        {label}
        {required ? null : <span className="font-normal text-muted-foreground"> (optional)</span>}
      </label>
      <Input
        id={`stay-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        min={min}
        step={step}
      />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  )
}

function LinesField({
  name,
  label,
  hint,
  defaultValue,
  rows = 4,
  placeholder
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string[]
  rows?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={`stay-${name}`} className={labelClass}>
        {label} <span className="font-normal text-muted-foreground">(one per line)</span>
      </label>
      <Textarea
        id={`stay-${name}`}
        name={name}
        rows={rows}
        defaultValue={(defaultValue ?? []).join("\n")}
        placeholder={placeholder}
      />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  )
}

/**
 * The listing form.
 *
 * `manageStructured=1` is sent because this form renders every optional field,
 * so a field left blank means "clear it" rather than "leave it alone" — the
 * same contract the package form uses. Without it an amenity list could be
 * added but never emptied.
 */
export default function AdminStayFormFields({ editing }: Props) {
  const isEditing = Boolean(editing)

  return (
    <div className="space-y-8">
      <input type="hidden" name="manageStructured" value="1" />

      <AdminPosterField existingImage={editing?.imagePath} isEditing={isEditing} kind="photo" />

      <AdminGalleryField existingGallery={editing?.gallery} />

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">The unit</h3>
        <Field
          name="title"
          label="Title"
          required
          defaultValue={editing?.title}
          placeholder="1BR Suite at Avida Riala"
        />
        <Field
          name="details"
          label="Card subtitle"
          required
          defaultValue={editing?.details}
          hint="One line, shown on the listing card."
          placeholder="1BR • 2 guests • Cebu IT Park"
        />
        <div className="space-y-1.5">
          <label htmlFor="stay-summary" className={labelClass}>
            Summary <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea id="stay-summary" name="summary" rows={3} defaultValue={editing?.summary ?? ""} />
          <p className={hintClass}>
            The paragraph under the title on the unit&apos;s own page. Falls back to the card
            subtitle when blank.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">Price</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="nightlyRate"
            label="Nightly rate"
            required
            type="number"
            min="1"
            step="1"
            defaultValue={editing?.nightlyRate}
            hint="Per night, in whole pesos."
          />
          <Field
            name="cleaningFee"
            label="Cleaning fee"
            type="number"
            min="0"
            step="1"
            defaultValue={editing?.cleaningFee}
            hint="Charged once per booking, not per night."
          />
          <Field
            name="minimumNights"
            label="Minimum nights"
            type="number"
            min="1"
            step="1"
            defaultValue={editing?.minimumNights}
            hint="Blank means one night is allowed."
          />
          <Field
            name="currency"
            label="Currency"
            defaultValue={editing?.currency}
            placeholder="PHP"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">
          Capacity &amp; layout
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="bedrooms"
            label="Bedrooms"
            required
            type="number"
            min="0"
            step="1"
            defaultValue={editing?.bedrooms}
            hint="0 for a studio."
          />
          <Field
            name="maxGuests"
            label="Sleeps (max guests)"
            required
            type="number"
            min="1"
            step="1"
            defaultValue={editing?.maxGuests}
          />
          <Field name="beds" label="Beds" type="number" min="0" step="1" defaultValue={editing?.beds} />
          <Field
            name="baths"
            label="Bathrooms"
            type="number"
            min="0"
            step="1"
            defaultValue={editing?.baths}
          />
          <Field
            name="floorArea"
            label="Floor area (sqm)"
            type="number"
            min="0"
            step="1"
            defaultValue={editing?.floorArea}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">Location</h3>
        <Field name="city" label="City" required defaultValue={editing?.city} placeholder="Cebu City" />
        <Field
          name="building"
          label="Building"
          defaultValue={editing?.building}
          placeholder="Avida Towers Riala"
        />
        <Field
          name="landmark"
          label="Landmark"
          defaultValue={editing?.landmark}
          hint="What it's near, in terms a guest would recognise."
          placeholder="5 minutes' walk to Ayala Center Cebu"
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">
          Amenities &amp; rules
        </h3>
        <LinesField
          name="amenities"
          label="Amenities"
          defaultValue={editing?.amenities}
          rows={6}
          placeholder={COMMON_AMENITIES.slice(0, 4).join("\n")}
          hint={`Common ones: ${COMMON_AMENITIES.slice(0, 8).join(", ")}…`}
        />
        <LinesField
          name="houseRules"
          label="House rules"
          defaultValue={editing?.houseRules}
          rows={4}
          placeholder={"No smoking indoors\nNo parties\nQuiet hours after 10pm"}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="checkInTime"
            label="Check-in time"
            defaultValue={editing?.checkInTime}
            placeholder="2:00 PM"
          />
          <Field
            name="checkOutTime"
            label="Check-out time"
            defaultValue={editing?.checkOutTime}
            placeholder="12:00 NN"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary/70">
          Accessibility
        </h3>
        <Field
          name="imageAlt"
          label="Photo description"
          defaultValue={editing?.imageAlt}
          hint="Read aloud by screen readers, and shown if the photo fails to load."
          placeholder="Living area with grey sofa and floor-to-ceiling city view"
        />
      </section>
    </div>
  )
}
