import type { Metadata } from "next"
import Link from "next/link"

import AccreditationLogo from "@/components/AccreditationLogo"
import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { accreditations, emailHref, isPublished, phoneHref, siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "About Us",
  description: `Who ${siteConfig.name} is, how we plan trips, and how to verify us before you book.`,
  alternates: { canonical: "/about" }
}

/**
 * Anything specific to the business that we have not been given renders as a
 * visible placeholder rather than an invented backstory. A fabricated founding
 * year or staff count on the page a customer visits to decide whether we are
 * real would defeat the point of the page.
 */
const TO_ADD = "To be added"

const howWeWork = [
  {
    heading: "You tell us the shape of the trip",
    body: "Destination, dates, who's travelling and roughly what you want to spend. If you're not sure yet, say so — most people aren't at this stage."
  },
  {
    heading: "We come back with a real itinerary",
    body: "Day by day, with the hotels, flights, inclusions and exclusions written out. Within 24 hours. You'll know the total cost before you commit to anything."
  },
  {
    heading: "You book when you're ready",
    body: "A deposit holds your slot. No pressure to decide on the call — take the itinerary away and think about it."
  },
  {
    heading: "We stay reachable while you're away",
    body: "Flight changes, transfer questions, anything that comes up mid-trip. You have a number that answers."
  }
]

export default function AboutPage() {
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
                About us
              </li>
            </ol>
          </nav>

          <header className="mt-6 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              About us
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-5xl">
              A small travel agency that writes everything down.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              {siteConfig.name} plans guided group trips out of the Philippines — Vietnam and
              Korea right now, with the full day-by-day itinerary, inclusions and exclusions
              published on every package page before you enquire. No &ldquo;details on
              request&rdquo;.
            </p>
          </header>

          <section aria-labelledby="how-heading" className="mt-14">
            <h2 id="how-heading" className="text-2xl font-bold text-primary">
              How booking with us works
            </h2>
            <ol className="mt-6 grid gap-5 sm:grid-cols-2">
              {howWeWork.map((item, index) => (
                <li
                  key={item.heading}
                  className="rounded-2xl border border-primary/10 bg-card p-6"
                >
                  <span className="text-sm font-bold text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-bold text-primary">{item.heading}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="verify-heading" className="mt-14">
            <h2 id="verify-heading" className="text-2xl font-bold text-primary">
              How to check we&apos;re legitimate
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              You should never wire money to a travel agency you haven&apos;t verified. Ours are
              below — ask us for copies of the certificates any time.
            </p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {accreditations.map((item) => {
                const published = isPublished(item)
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-primary/10 bg-card p-5"
                  >
                    {/*
                      The mark lives inside the <dt>, not beside it: a <div>
                      grouping inside a <dl> may only contain <dt> and <dd>,
                      so a sibling here would break the list's content model.
                    */}
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <AccreditationLogo item={item} />
                      {item.label}
                    </dt>
                    <dd
                      className={`mt-1 font-bold ${
                        published ? "text-primary" : "italic text-muted-foreground"
                      }`}
                    >
                      {published ? item.value : TO_ADD}
                    </dd>
                    <dd className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {item.note}
                    </dd>
                  </div>
                )
              })}
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              Payments go only to business accounts in the name {siteConfig.name} — never to a
              personal account. The{" "}
              <Link
                href="/policies"
                className="font-semibold text-primary underline underline-offset-4"
              >
                payment &amp; cancellation policy
              </Link>{" "}
              sets out deposits, deadlines and refunds.
            </p>
          </section>

          <section aria-labelledby="reach-heading" className="mt-14">
            <h2 id="reach-heading" className="text-2xl font-bold text-primary">
              Where to find us
            </h2>
            <dl className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Phone
                </dt>
                <dd className="mt-1">
                  <a href={phoneHref} className="font-semibold text-primary hover:underline">
                    {siteConfig.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1">
                  <a href={emailHref} className="font-semibold text-primary hover:underline">
                    {siteConfig.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Office
                </dt>
                <dd
                  className={`mt-1 font-semibold ${
                    siteConfig.address.street ? "text-primary" : "italic text-muted-foreground"
                  }`}
                >
                  {siteConfig.address.street
                    ? [
                        siteConfig.address.street,
                        siteConfig.address.city,
                        siteConfig.address.region
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : TO_ADD}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Hours
                </dt>
                <dd className="mt-1 font-semibold text-primary">{siteConfig.hours}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-primary/15 bg-primary p-8 text-primary-foreground">
            <h2 className="text-2xl font-bold">Ready to plan something?</h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/80">
              Browse what we&apos;re running now, or tell us where you want to go and we&apos;ll
              build it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/packages"
                className="inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
              >
                See our packages
              </Link>
              <Link
                href="/#contact"
                className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Plan a trip
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
