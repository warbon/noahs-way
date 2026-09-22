"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { MAX_GALLERY_PHOTOS } from "@/lib/stay-data"

type Props = {
  /** Photos already stored on the record, in their current order. */
  existingGallery?: string[]
}

type Pending = { file: File; url: string }

/**
 * The extra photos beyond the cover image.
 *
 * Two lists in one control, because they behave differently: stored photos can
 * be reordered and removed but not re-uploaded, while newly chosen files can
 * only be added or dropped before saving. Merging them into one draggable list
 * would mean tracking which entries are files and which are paths, for a
 * control most owners touch once per unit.
 *
 * Order is submitted as a JSON array in a hidden field. The server keeps that
 * order but takes membership from the stored record, so this field cannot point
 * a listing at an arbitrary image.
 */
export default function AdminGalleryField({ existingGallery }: Props) {
  const [kept, setKept] = useState<string[]>(existingGallery ?? [])
  const [pending, setPending] = useState<Pending[]>([])

  // Object URLs hold each preview in memory until revoked.
  useEffect(() => {
    return () => {
      for (const item of pending) URL.revokeObjectURL(item.url)
    }
    // Intentionally on unmount only: revoking on every change would kill the
    // previews still on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = kept.length + pending.length
  const remaining = MAX_GALLERY_PHOTOS - total

  function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? [])
    if (chosen.length === 0) return

    const accepted = chosen.slice(0, Math.max(remaining, 0))
    setPending((current) => [
      ...current,
      ...accepted.map((file) => ({ file, url: URL.createObjectURL(file) }))
    ])

    // Cleared so picking the same file again still fires a change event.
    event.target.value = ""
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= kept.length) return

    setKept((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeKept(path: string) {
    setKept((current) => current.filter((item) => item !== path))
  }

  function removePending(url: string) {
    setPending((current) => {
      const match = current.find((item) => item.url === url)
      if (match) URL.revokeObjectURL(match.url)
      return current.filter((item) => item.url !== url)
    })
  }

  /*
    The files the browser actually submits. A file input's own FileList cannot
    be edited, so removing one pending photo means rebuilding the list — a
    DataTransfer is the only way to hand a FileList back to an input.
  */
  useEffect(() => {
    const input = document.getElementById("stay-gallery-files") as HTMLInputElement | null
    if (!input) return

    const transfer = new DataTransfer()
    for (const item of pending) transfer.items.add(item.file)
    input.files = transfer.files
  }, [pending])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">
          More photos{" "}
          <span className="font-normal text-muted-foreground">
            ({total} of {MAX_GALLERY_PHOTOS})
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown under the cover photo on the unit&apos;s page. Guests book off the bedroom, the
          bathroom and the view — the cover alone rarely sells a unit.
        </p>
      </div>

      <input type="hidden" name="gallery" value={JSON.stringify(kept)} />

      {total > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {kept.map((path, index) => (
            <li key={path} className="space-y-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={path} alt="" fill sizes="120px" className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move photo ${index + 1} earlier`}
                    className="rounded border border-input px-1.5 text-xs disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === kept.length - 1}
                    aria-label={`Move photo ${index + 1} later`}
                    className="rounded border border-input px-1.5 text-xs disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeKept(path)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="text-xs font-medium text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}

          {pending.map((item, index) => (
            <li key={item.url} className="space-y-1">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-accent bg-muted">
                {/* A blob: URL has nothing for the optimizer to fetch. */}
                <Image src={item.url} alt="" fill sizes="120px" unoptimized className="object-cover" />
                <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  NEW
                </span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removePending(item.url)}
                  aria-label={`Remove new photo ${index + 1}`}
                  className="text-xs font-medium text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No extra photos yet.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="stay-gallery-picker" className="sr-only">
          Add more photos
        </label>
        <Input
          id="stay-gallery-picker"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={remaining <= 0}
          onChange={onFilesChosen}
        />
        {/*
          The picker above is only a chooser; this is what submits. Keeping them
          apart is what makes a pending photo removable — the chooser's own
          FileList would otherwise be whatever was last selected.
        */}
        <input id="stay-gallery-files" name="galleryImages" type="file" multiple hidden />
        <p className="text-xs text-muted-foreground">
          {remaining > 0
            ? `JPG, PNG or WEBP up to 8MB each. ${remaining} slot${remaining === 1 ? "" : "s"} left.`
            : "Limit reached — remove a photo to add another."}
        </p>
      </div>
    </div>
  )
}
