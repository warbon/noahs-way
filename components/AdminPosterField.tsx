"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"

type Props = {
  /** The stored poster when editing, shown until a new file is chosen. */
  existingImage?: string
  isEditing: boolean
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
export default function AdminPosterField({ existingImage, isEditing }: Props) {
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
          Package poster
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
            className="relative mx-auto block aspect-[2/3] w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Open the poster full size in a new tab"
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
                  ? "New poster — this will replace the current one."
                  : "This poster will be saved with the package."
                : "Current poster."}{" "}
              Check the fields below against it before saving.
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
              Open full size to read the fine print
            </a>
          </figcaption>
        </figure>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No poster chosen yet.
        </p>
      )}
    </div>
  )
}
