"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"

/**
 * What the image actually is, which changes more than the wording.
 *
 * A package poster is a portrait flyer whose fine print gets transcribed into
 * the fields below, so it is framed 2:3 and shown large enough to read. A condo
 * photo is a landscape photograph that is only ever checked for "is this the
 * right unit" — framed 2:3 it would sit in a tall box, letterboxed top and
 * bottom, next to copy telling the admin to read print that isn't there.
 */
export type PosterFieldKind = "poster" | "photo"

const KIND_COPY = {
  poster: {
    label: "Package poster",
    aspectClass: "aspect-[2/3]",
    empty: "No poster chosen yet.",
    replacing: "New poster — this will replace the current one.",
    saving: "This poster will be saved with the package.",
    current: "Current poster.",
    check: " Check the fields below against it before saving.",
    openTitle: "Open the poster full size in a new tab",
    openLabel: "Open full size to read the fine print"
  },
  photo: {
    label: "Cover photo",
    aspectClass: "aspect-[4/3]",
    empty: "No photo chosen yet.",
    replacing: "New photo — this will replace the current one.",
    saving: "This photo will be saved with the unit.",
    current: "Current photo.",
    check: " This is the image guests see on the listing card.",
    openTitle: "Open the photo full size in a new tab",
    openLabel: "Open full size"
  }
} as const

type Props = {
  /** The stored image when editing, shown until a new file is chosen. */
  existingImage?: string
  isEditing: boolean
  /** Defaults to the package poster treatment. */
  kind?: PosterFieldKind
}

/**
 * The poster upload, with a preview of whatever will actually be saved.
 *
 * This sits first in the form because everything below it is derived from the
 * poster — "Read poster" transcribes this image into the remaining fields, so
 * asking for the file first matches the order the work happens in. The preview
 * exists because the catalogue's original defect was posters attached to the
 * wrong record: seeing the artwork next to the title you are typing is what
 * catches a Hanoi flyer filed as a Cebu trip.
 */
// The enclosing <fieldset disabled> already gates every input inside it, so
// this takes no `disabled` prop of its own.
export default function AdminPosterField({ existingImage, isEditing, kind = "poster" }: Props) {
  const copy = KIND_COPY[kind]
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const shownImage = previewUrl ?? existingImage ?? null
  const isNewFile = Boolean(previewUrl)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="image" className="text-sm font-medium text-foreground">
          {copy.label}
        </label>
        <Input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!isEditing}
          onChange={onFileChange}
        />
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WEBP up to 8MB.
          {isEditing ? " Leave empty to keep the current image." : ""}
        </p>
      </div>

      {shownImage ? (
        <figure className="space-y-2">
          {/*
            Sized to be read, not just recognised. The point of this preview is
            checking transcribed prices and dates against the artwork, and the
            fine print on these flyers is unreadable at thumbnail size. Opening
            the original in a new tab is the escape hatch for the smallest print
            — the browser's own zoom beats anything worth building here.
          */}
          <a
            href={shownImage}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative mx-auto block ${copy.aspectClass} w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
            title={copy.openTitle}
          >
            <Image
              src={shownImage}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              // A blob: URL has nothing for the optimizer to fetch, and the
              // stored poster is only ever viewed by one admin.
              unoptimized
              className="object-contain"
            />
          </a>
          <figcaption className="space-y-1 text-center text-xs text-muted-foreground">
            <span className="block">
              {/* There is nothing to replace on the create form. */}
              {isNewFile
                ? isEditing
                  ? copy.replacing
                  : copy.saving
                : copy.current}
              {copy.check}
            </span>
            {/*
              Stated rather than revealed on hover: a hover-only hint does not
              exist on a touch screen, and this is the affordance for reading the
              smallest print on the flyer.
            */}
            <a
              href={shownImage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copy.openLabel}
            </a>
          </figcaption>
        </figure>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          {copy.empty}
        </p>
      )}
    </div>
  )
}
