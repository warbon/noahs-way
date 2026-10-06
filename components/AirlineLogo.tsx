"use client"

import Image from "next/image"
import { useState } from "react"

import { airlineLogoUrl, type ResolvedAirline } from "@/lib/airlines"
import { cn } from "@/lib/utils"

type Props = {
  airline: ResolvedAirline
  /** Height the logo is drawn at, in pixels; its box is two and a half times as wide. */
  height?: number
  /** Show the airline's name beside the logo. Without it the logo alone carries the name, as alt text. */
  showName?: boolean
  className?: string
}

/**
 * An airline's logo on a white chip — logos are drawn for light backgrounds —
 * with its name beside it.
 *
 * The logo comes from an outside service by IATA code, so it can fail: an
 * unlisted airline has no code, and the service can be down or not know one.
 * Either way the name stands in as a text badge, so the airline is never
 * shown as a broken image or left out.
 */
export default function AirlineLogo({ airline, height = 20, showName = true, className }: Props) {
  const [failed, setFailed] = useState(false)
  const width = Math.round(height * 2.5)
  const hasLogo = Boolean(airline.code) && !failed

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {hasLogo ? (
        <span className="inline-flex shrink-0 items-center rounded-md bg-white px-1.5 py-0.5 ring-1 ring-black/5">
          <Image
            src={airlineLogoUrl(airline.code as string, width, height)}
            width={width}
            height={height}
            // Beside the name the logo is decoration; alone, it is the name.
            alt={showName ? "" : airline.name}
            unoptimized
            onError={() => setFailed(true)}
            className="object-contain"
            style={{ width, height }}
          />
        </span>
      ) : showName ? null : (
        <span className="inline-flex shrink-0 items-center rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-black/5">
          {airline.name}
        </span>
      )}
      {showName ? <span>{airline.name}</span> : null}
    </span>
  )
}
