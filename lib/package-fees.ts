import type { TravelPackage } from "@/lib/package-data"

/**
 * Structured costs that sit outside the headline package price.
 *
 * The exclusions list already carries these as prose, and that prose stays —
 * it is transcribed from the poster and is the authoritative wording. What it
 * cannot do is arithmetic. Parsing "20kg ₱1,700, 32kg ₱3,500 ... per pax per
 * way" with a regex would produce a confidently wrong total, which is the exact
 * failure this catalogue was cleaned up to remove.
 *
 * So the amounts are entered once, structurally, alongside the prose. A fee
 * with no amount is still worth listing: "visa fee, subject to quotation" is
 * information, and the estimate says plainly that it is not counted.
 */

export type FeeBasis =
  | "per-person"
  | "per-person-per-way"
  | "per-person-per-day"
  | "per-booking"

export type PackageFee = {
  label: string
  /** Omitted when the amount genuinely is not known in advance. */
  amount?: number
  currency?: "PHP" | "USD"
  basis: FeeBasis
  /** Mandatory fees are always counted; optional ones the traveller chooses. */
  required: boolean
  /** Shown under the label — tiers, where it is collected, who it applies to. */
  note?: string
}

export const FEE_BASIS_LABELS: Record<FeeBasis, string> = {
  "per-person": "per person",
  "per-person-per-way": "per person, each way",
  "per-person-per-day": "per person, per day",
  "per-booking": "per booking"
}

function multiplierFor(basis: FeeBasis, travellers: number, days: number) {
  switch (basis) {
    case "per-person":
      return travellers
    case "per-person-per-way":
      return travellers * 2
    case "per-person-per-day":
      return travellers * Math.max(days, 1)
    case "per-booking":
      return 1
  }
}

export type CostLine = {
  label: string
  note?: string
  currency: "PHP" | "USD"
  total: number
  required: boolean
}

export type CostEstimate = {
  /** Package price × travellers. Absent when the package has no numeric price. */
  packageTotal?: number
  lines: CostLine[]
  /** Everything countable, in pesos. */
  phpTotal: number
  /** Kept separate rather than converted — an invented FX rate ages badly. */
  usdTotal: number
  /** Fees that exist but carry no amount, so the estimate cannot include them. */
  uncounted: PackageFee[]
}

export function estimateTripCost(
  pkg: Pick<TravelPackage, "priceAmount" | "durationDays" | "fees">,
  options: { travellers: number; includeOptional: string[] }
): CostEstimate {
  const travellers = Math.max(options.travellers, 1)
  const days = pkg.durationDays ?? 1

  const packageTotal =
    typeof pkg.priceAmount === "number" ? pkg.priceAmount * travellers : undefined

  const lines: CostLine[] = []
  const uncounted: PackageFee[] = []

  for (const fee of pkg.fees ?? []) {
    // Surfaced before the chosen check on purpose. A fee with no published
    // amount can never be added up, so hiding it until someone ticks a box
    // would mean "visa fee, subject to quotation" simply never appeared —
    // the exact omission this tool exists to prevent.
    if (typeof fee.amount !== "number") {
      uncounted.push(fee)
      continue
    }

    const chosen = fee.required || options.includeOptional.includes(fee.label)
    if (!chosen) continue

    lines.push({
      label: fee.label,
      note: fee.note,
      currency: fee.currency ?? "PHP",
      total: fee.amount * multiplierFor(fee.basis, travellers, days),
      required: fee.required
    })
  }

  const phpTotal =
    (packageTotal ?? 0) +
    lines.filter((line) => line.currency === "PHP").reduce((sum, line) => sum + line.total, 0)

  const usdTotal = lines
    .filter((line) => line.currency === "USD")
    .reduce((sum, line) => sum + line.total, 0)

  return { packageTotal, lines, phpTotal, usdTotal, uncounted }
}

export function formatMoney(amount: number, currency: "PHP" | "USD" = "PHP") {
  const symbol = currency === "USD" ? "US$" : "₱"
  return `${symbol}${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
}
