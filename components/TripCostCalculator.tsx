"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  FEE_BASIS_LABELS,
  estimateTripCost,
  formatMoney,
  type PackageFee
} from "@/lib/package-fees"

/**
 * Adds up what a trip actually costs.
 *
 * This is the one thing the site can do that competitors cannot, and only
 * because the exclusions are published. A bullet list of fees still leaves the
 * customer doing arithmetic across three different units — per person, each
 * way, per day — which is where the surprise at the airport comes from.
 *
 * Two rules keep it honest. Fees with no published amount are named rather than
 * silently dropped, so the reader can see what the number does not include. And
 * dollar amounts are shown as dollars: converting them at a rate hardcoded here
 * would be wrong within weeks.
 */
export default function TripCostCalculator({
  priceAmount,
  durationDays,
  fees,
  packageTitle
}: {
  priceAmount?: number
  durationDays?: number
  fees?: PackageFee[]
  packageTitle: string
}) {
  const [travellers, setTravellers] = useState(2)
  const [includeOptional, setIncludeOptional] = useState<string[]>([])

  const optionalFees = useMemo(
    () => (fees ?? []).filter((fee) => !fee.required && typeof fee.amount === "number"),
    [fees]
  )

  const estimate = useMemo(
    () =>
      estimateTripCost({ priceAmount, durationDays, fees }, { travellers, includeOptional }),
    [priceAmount, durationDays, fees, travellers, includeOptional]
  )

  // Without a numeric price or any fees there is nothing to add up.
  if (typeof priceAmount !== "number" && !(fees ?? []).length) return null

  const toggle = (label: string) =>
    setIncludeOptional((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    )

  return (
    <section
      aria-labelledby="cost-calculator-heading"
      className="rounded-2xl border border-primary/15 bg-card p-6"
    >
      <h2 id="cost-calculator-heading" className="text-lg font-bold text-primary">
        What this trip really costs
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The package price plus the fees that sit outside it. Change the number of travellers to
        see the whole thing.
      </p>

      <div className="mt-5 max-w-[12rem] space-y-1.5">
        <label htmlFor="cost-travellers" className="text-sm font-medium text-foreground">
          Travellers
        </label>
        <Input
          id="cost-travellers"
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          value={travellers}
          onChange={(event) => setTravellers(Math.max(1, Number(event.target.value) || 1))}
        />
      </div>

      {optionalFees.length > 0 ? (
        <fieldset className="mt-5 space-y-2">
          <legend className="text-sm font-medium text-foreground">Add if you need it</legend>
          {optionalFees.map((fee) => (
            <label
              key={fee.label}
              className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={includeOptional.includes(fee.label)}
                onChange={() => toggle(fee.label)}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>
                <span className="font-medium text-foreground">{fee.label}</span>
                {" — "}
                {formatMoney(fee.amount ?? 0, fee.currency ?? "PHP")} {FEE_BASIS_LABELS[fee.basis]}
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
        {typeof estimate.packageTotal === "number" ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-foreground">
              {packageTitle}
              <span className="block text-xs text-muted-foreground">
                {formatMoney(priceAmount ?? 0)} × {travellers}
              </span>
            </dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {formatMoney(estimate.packageTotal)}
            </dd>
          </div>
        ) : null}

        {estimate.lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">
              {line.label}
              {line.note ? <span className="block text-xs">{line.note}</span> : null}
            </dt>
            <dd className="tabular-nums text-muted-foreground">
              {formatMoney(line.total, line.currency)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-border pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-bold text-primary">Estimated total</p>
          <p className="text-xl font-bold tabular-nums text-primary">
            {formatMoney(estimate.phpTotal)}
          </p>
        </div>
        {estimate.usdTotal > 0 ? (
          <p className="mt-1 text-right text-sm text-muted-foreground">
            plus {formatMoney(estimate.usdTotal, "USD")}
          </p>
        ) : null}
        <p className="mt-1 text-right text-xs text-muted-foreground">
          for {travellers} {travellers === 1 ? "traveller" : "travellers"}
        </p>
      </div>

      {estimate.uncounted.length > 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-4">
          <p className="text-xs font-semibold text-foreground">Not included in that number</p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {estimate.uncounted.map((fee) => (
              <li key={fee.label}>
                {fee.label}
                {fee.note ? ` — ${fee.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-muted-foreground">
        An estimate, not a quote. Airline and government charges change, and we confirm the final
        figure in writing before you pay anything.
      </p>
    </section>
  )
}
