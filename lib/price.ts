/**
 * The catalog stores `price` as a free-text display string, in at least two
 * formats ("from PHP 29,800" and "24,000.00"). These helpers derive numbers for
 * sorting and display, but are only ever a fallback — `priceAmount` set through
 * the admin editor is the source of truth.
 */
export function parsePriceAmount(price: string | undefined): number | undefined {
  if (!price) return undefined

  const match = price.replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  if (!match) return undefined

  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? value : undefined
}

export function formatPricePHP(amount: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount)
}

/** Renders one consistent price label regardless of which fields are present. */
export function formatPackagePrice(pkg: {
  price: string
  priceAmount?: number
  currency?: string
}) {
  if (typeof pkg.priceAmount === "number") {
    return `From ${formatPricePHP(pkg.priceAmount, pkg.currency ?? "PHP")}`
  }
  return pkg.price
}

export function parseDurationFromDetails(details: string | undefined) {
  if (!details) return {}

  const days = details.match(/(\d+)\s*Days?/i)
  const nights = details.match(/(\d+)\s*Nights?/i)

  return {
    durationDays: days ? Number.parseInt(days[1], 10) : undefined,
    durationNights: nights ? Number.parseInt(nights[1], 10) : undefined
  }
}

export function formatDuration(days?: number, nights?: number) {
  if (!days && !nights) return undefined
  if (days && nights) return `${days} Days / ${nights} Nights`
  return days ? `${days} Days` : `${nights} Nights`
}
