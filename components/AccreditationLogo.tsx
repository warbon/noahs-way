import Image from "next/image"

import { isPublished, type Accreditation } from "@/lib/site-config"

/**
 * The issuing body's mark for one registration, or nothing.
 *
 * Same stance as the payment badges: the file has to be the issuer's own
 * artwork rather than something redrawn here.
 *
 * Nothing is rendered for an entry whose number is still blank, even when a
 * file has been supplied. An official emblem sitting above the "to be added"
 * placeholder would read as a credential the business holds, in the one section
 * that exists so buyers can check exactly that before paying.
 *
 * The white chip is not decoration either. Both marks are drawn in dark navy,
 * which is also the footer's background — on their own they would disappear
 * down there. The chip gives them a light backing everywhere, so the same
 * markup works on the dark footer and the light About card.
 */
export default function AccreditationLogo({ item }: { item: Accreditation }) {
  if (!item.logo || !isPublished(item)) return null

  return (
    // `flex w-fit` rather than `inline-flex`: block-level so the chip keeps its
    // own line inside the About page's <dt>, and hugs the mark rather than
    // stretching across the card.
    <span className="mb-3 flex w-fit items-center justify-center rounded-lg bg-white p-2">
      {/*
        Decorative: the label and number sit directly alongside, so naming the
        mark again would only make a screen reader repeat itself.

        Height-constrained to 56px — these carry fine print, and the
        "PHILIPPINES" under the DTI mark stops resolving below about 48px. The
        width/height come from the file itself so the reserved box matches what
        actually loads.
      */}
      <Image
        src={item.logo.src}
        alt=""
        width={item.logo.width}
        height={item.logo.height}
        className="h-14 w-auto"
      />
    </span>
  )
}
