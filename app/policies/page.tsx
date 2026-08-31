import type { Metadata } from "next"
import Link from "next/link"

import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import PaymentMethods from "@/components/PaymentMethods"
import { accreditations, emailHref, isPublished, phoneHref, siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Payment & Cancellation Policy",
  description:
    "How to pay for a Noah's Way package, when the balance is due, and what happens if you need to cancel or reschedule.",
  alternates: { canonical: "/policies" }
}

/**
 * Figures a customer needs before committing money. Anything the business has
 * not confirmed yet is rendered as a visible placeholder rather than a plausible
 * guess — publishing an invented deposit or refund term would be worse than
 * publishing nothing.
 */
const TO_CONFIRM = "To be confirmed"

const terms = [
  {
    heading: "Reserving your slot",
    body: `A deposit confirms your booking and holds your seats. Deposit amount: ${TO_CONFIRM} — we'll state it on your quote before you pay anything.`
  },
  {
    heading: "Balance due",
    body: `The remaining balance is due before departure. Deadline: ${TO_CONFIRM} days before the travel date, confirmed in writing when you book.`
  },
  {
    heading: "If you cancel",
    body: `Refund terms depend on how far out you cancel and on what our airline and hotel partners allow. Schedule: ${TO_CONFIRM}. Airfare is generally non-refundable once ticketed.`
  },
  {
    heading: "If you reschedule",
    body: `Moving to another departure date is subject to availability and to any airline rebooking fee. Rebooking terms: ${TO_CONFIRM}.`
  },
  {
    heading: "If we cancel",
    body: "If a departure does not push through on our side, you may move to another date or take a full refund of everything you have paid us."
  },
  {
    heading: "What is never included",
    body: "Philippine travel tax, mandatory tipping, check-in baggage beyond the stated allowance, travel insurance and visa fees are listed per package on its own page. Check the exclusions before you budget."
  }
]

export default function PoliciesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                Payment &amp; cancellation
              </li>
            </ol>
          </nav>

          <header className="mt-6">
            <h1 className="text-3xl font-bold text-primary md:text-4xl">
              Payment &amp; cancellation policy
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              What you pay, when you pay it, and what happens if plans change. If anything here
              is unclear, ask us before you send money — we&apos;d rather answer twice than have
              you guess.
            </p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <section
                aria-labelledby="terms-heading"
                className="rounded-2xl border border-dashed border-accent/50 bg-accent/5 p-5"
              >
                <h2 id="terms-heading" className="sr-only">
                  Booking terms
                </h2>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> the amounts and deadlines
                  below are marked &ldquo;{TO_CONFIRM}&rdquo; until Noah&apos;s Way publishes
                  them. Every quote states the real figures in writing before any payment is
                  due.
                </p>
              </section>

              <dl className="space-y-6">
                {terms.map((term) => (
                  <div key={term.heading} className="border-t border-border pt-5">
                    <dt className="font-bold text-primary">{term.heading}</dt>
                    <dd className="mt-2 text-sm text-muted-foreground">{term.body}</dd>
                  </div>
                ))}
              </dl>

              <section aria-labelledby="verify-heading" className="border-t border-border pt-5">
                <h2 id="verify-heading" className="font-bold text-primary">
                  Verifying us before you pay
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  You are entitled to check that any travel agency is properly registered before
                  handing over money. Our registrations:
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {accreditations.map((item) => {
                    const published = isPublished(item)
                    return (
                      <li key={item.label}>
                        <span className="font-semibold text-foreground">{item.label}:</span>{" "}
                        <span
                          className={published ? "" : "italic text-muted-foreground"}
                        >
                          {published ? item.value : TO_CONFIRM}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  Ask us for copies of these documents at any time. Never send payment to a
                  personal account — ours are business accounts in the name{" "}
                  {siteConfig.name}.
                </p>
              </section>

              <section aria-labelledby="ask-heading" className="border-t border-border pt-5">
                <h2 id="ask-heading" className="font-bold text-primary">
                  Questions before booking
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Call{" "}
                  <a href={phoneHref} className="font-semibold text-primary hover:underline">
                    {siteConfig.phone}
                  </a>{" "}
                  or email{" "}
                  <a href={emailHref} className="font-semibold text-primary hover:underline">
                    {siteConfig.email}
                  </a>
                  . We&apos;re open {siteConfig.hours}.
                </p>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <PaymentMethods showPolicyLink={false} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
