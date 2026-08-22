import Link from "next/link"

import PaymentBadge from "@/components/PaymentBadge"
import { paymentMethods } from "@/lib/site-config"

/**
 * Shown wherever a customer is looking at a price.
 *
 * Naming the instalment option next to the price is the point: a ₱43,999
 * package reads very differently once GGives spreading it over 24 months is on
 * the same screen, and a buyer who can't see how to pay assumes they can't.
 */
type PaymentMethodsProps = {
  className?: string
  /** Off on the policy page itself, where the link would point at the page you're reading. */
  showPolicyLink?: boolean
}

export default function PaymentMethods({
  className = "",
  showPolicyLink = true
}: PaymentMethodsProps) {
  return (
    <section
      aria-labelledby="payment-methods-heading"
      className={`rounded-2xl border border-primary/15 bg-card p-6 ${className}`}
    >
      <h2 id="payment-methods-heading" className="text-lg font-bold text-primary">
        How you can pay
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Reserve with a deposit and settle the balance before departure. We&apos;ll confirm the
        exact schedule when we send your quote.
      </p>

      {/*
        Badges first so the options register at a glance, with the per-method
        detail under each. A bulleted list of five payment names reads as terms
        and conditions; the point here is recognition.
      */}
      <ul className="mt-4 space-y-3">
        {paymentMethods.map((method) => (
          <li key={method.name} className="space-y-1.5">
            <PaymentBadge method={method} />
            <p className="text-sm text-muted-foreground">{method.detail}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs text-muted-foreground">
        Account details are sent with your quote — never pay to a personal account.
        {showPolicyLink ? (
          <>
            {" "}
            <Link
              href="/policies"
              className="underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Read the payment &amp; cancellation policy
            </Link>
            .
          </>
        ) : null}
      </p>
    </section>
  )
}
