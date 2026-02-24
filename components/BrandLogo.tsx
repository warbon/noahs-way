import Image from "next/image"

type BrandLogoProps = {
  compact?: boolean
}

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <Image
      src="/images/noahs-way-logo.png"
      alt="Noah's Way Travel logo"
      width={compact ? 180 : 320}
      height={compact ? 90 : 160}
      className={compact ? "h-auto w-[180px]" : "h-auto w-full max-w-[320px]"}
      priority
    />
  )
}
