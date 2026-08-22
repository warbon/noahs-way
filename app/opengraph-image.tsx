import { ImageResponse } from "next/og"

import { siteConfig } from "@/lib/site-config"

/**
 * Without this, every link shared to Facebook — the main discovery channel for
 * this market — rendered as a blank card, because the layout declares
 * `twitter: summary_large_image` and an `openGraph` block with no image behind
 * either of them.
 *
 * Drawn rather than photographed so it needs no bundled asset and stays correct
 * if the business name or tagline changes.
 */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0B1B34 0%, #132D4E 55%, #1C3C66 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#EBA733",
              color: "#0B1B34",
              fontSize: 34,
              fontWeight: 700
            }}
          >
            nw
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#ECD39C"
            }}
          >
            Noah&apos;s Way Travel &amp; Tours
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            See the whole itinerary before you book.
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.78)", maxWidth: 860 }}>
            Vietnam and Korea packages with day-by-day plans, full inclusions, and transparent
            peso pricing.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 24, color: "rgba(255,255,255,0.72)" }}>
          <span>Roundtrip airfare included</span>
          <span>English-speaking guide</span>
          <span>{siteConfig.phone}</span>
        </div>
      </div>
    ),
    size
  )
}
