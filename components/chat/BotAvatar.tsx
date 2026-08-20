import type React from "react"

import { cn } from "@/lib/utils"

/**
 * The assistant's face.
 *
 * Inline SVG rather than an icon-font glyph so the eyes and antenna can be
 * animated independently — the blink is what makes it read as a character
 * rather than a logo. Purely decorative: the button that holds it carries the
 * accessible name.
 */
export default function BotAvatar({
  className,
  ...props
}: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("bot-avatar", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Antenna */}
      <path
        d="M16 7.5V4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle className="bot-antenna" cx="16" cy="3" r="2" fill="currentColor" />

      {/* Head */}
      <rect
        x="4.5"
        y="8"
        width="23"
        height="17.5"
        rx="6.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />

      {/* Ears */}
      <path
        d="M2.6 14.5v4.5M29.4 14.5v4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Eyes — the blink target */}
      <g fill="currentColor">
        <ellipse className="bot-eye" cx="11.8" cy="16.4" rx="2.05" ry="2.5" />
        <ellipse className="bot-eye" cx="20.2" cy="16.4" rx="2.05" ry="2.5" />
      </g>
    </svg>
  )
}
