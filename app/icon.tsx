import { ImageResponse } from "next/og"

/**
 * Generated rather than shipped as a file so the mark stays in step with the
 * brand colours in one place. The full logo is unreadable at 32px, so this
 * reduces it to the monogram.
 */
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#132D4E",
          color: "#EBA733",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          borderRadius: 6
        }}
      >
        nw
      </div>
    ),
    size
  )
}
