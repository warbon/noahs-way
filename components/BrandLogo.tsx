import Image from "next/image"

type BrandLogoProps = {
  compact?: boolean
}

/**
 * Uses the 2172×724 asset deliberately.
 *
 * `noahs-way-logo-w.png` is a tenth of the file size but is not a smaller
 * encoding of the same artwork — the "-w" is a baked white background, fully
 * opaque, which paints a white box over the header and the navy footer. Only
 * this file has a real transparent background.
 *
 * The weight barely reaches the visitor anyway: next/image re-encodes it to
 * WebP at the rendered width, so the browser fetches a few kB. The large source
 * is a build-time cost, not a page-weight one.
 *
 * Width and height carry the artwork's real 3:1 ratio. They previously declared
 * 2:1, which `h-auto` corrected visually but only after the browser had already
 * reserved the wrong box, shifting the header on first paint.
 */
const LOGO_WIDTH = 2172
const LOGO_HEIGHT = 724

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Image
      src="/images/noahs-way-logo.png"
      alt="Noah's Way Travel logo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      sizes={compact ? "180px" : "320px"}
      className={compact ? "h-auto w-[180px]" : "h-auto w-full max-w-[320px]"}
      priority
    />
  )
}
