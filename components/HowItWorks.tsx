import Link from "next/link"

import Reveal from "@/components/Reveal"
import { getPackagesByCategory } from "@/lib/package-repository"

/**
 * Replaces a band of unfalsifiable promises.
 *
 * The previous section claimed "comfort, style, and zero stress" over four
 * cards — vetted hotels, transfers handled, guided not herded — that any
 * competitor could have pasted onto their own site unchanged. It took the
 * heaviest visual weight on the page to say nothing checkable.
 *
 * It sits immediately before the enquiry form, and at that point a visitor has
 * two real questions: what happens if I fill this in, and what will it actually
 * cost. So the section answers those instead. The steps are a genuine sequence,
 * which is why they are numbered; the figures are read from the live catalogue
 * so they cannot drift away from what is on sale.
 */

const steps = [
  {
    title: "You send the details",
    text: "Where, roughly when, and how many of you. Two minutes, and no payment details at this stage."
  },
  {
    title: "We reply within 24 hours",
    text: "With the options that fit, the departure dates still open, and the total including the fees that sit outside the package price."
  },
  {
    title: "A deposit holds your slot",
    text: "The balance is due before departure. We put the amounts and the deadline in writing before you pay anything."
  },
  {
    title: "We stay reachable",
    text: "Through the visa paperwork, the airport, and the trip itself. Same person throughout, not a ticket queue."
  }
]

export default async function HowItWorks() {
  const [local, international] = await Promise.all([
    getPackagesByCategory("local"),
    getPackagesByCategory("international")
  ])
  const packages = [...international, ...local]

  const prices = packages.map((pkg) => pkg.priceAmount).filter((n): n is number => Boolean(n))
  const departures = packages.reduce((total, pkg) => total + (pkg.travelPeriods?.length ?? 0), 0)
  const countries = Array.from(
    new Set(
      packages
        .map((pkg) => pkg.destination?.split(",").pop()?.trim())
        .filter((name): name is string => Boolean(name))
    )
  )

  // Each figure is a fact about the catalogue, not a claim about ourselves.
  const facts = [
    prices.length ? { value: `₱${Math.min(...prices).toLocaleString()}`, label: "Lowest package, per person" } : null,
    departures ? { value: String(departures), label: "Departure windows published" } : null,
    countries.length
      ? { value: String(countries.length), label: `Countries — ${countries.join(" and ")}` }
      : null,
    packages.length ? { value: `${packages.length}/${packages.length}`, label: "Trips with a full itinerary and fee list online" } : null
  ].filter((fact): fact is { value: string; label: string } => fact !== null)

  return (
    <section className="relative overflow-hidden px-5 py-20 md:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(9,25,53,0.95),rgba(21,45,81,0.94))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(226,181,103,0.22),transparent_32%)]" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-secondary">
            How booking works
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            Ask a question, get a real quote. No obligation either way.
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 110}>
                <div className="h-full rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
                  <span className="text-sm font-bold text-secondary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{step.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        {facts.length ? (
          <Reveal delay={200}>
            <dl className="mt-12 grid gap-x-8 gap-y-6 border-t border-white/20 pt-8 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-2xl font-bold text-secondary md:text-3xl">{fact.value}</dt>
                  <dd className="mt-1 text-sm text-white/75">{fact.label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ) : null}

        <Reveal delay={260}>
          <p className="mt-8 text-sm text-white/75">
            Not sure yet?{" "}
            <Link
              href="/guides"
              className="font-semibold text-secondary underline underline-offset-4 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              Read the guides first
            </Link>{" "}
            — they answer the visa and cost questions without needing to talk to us.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
