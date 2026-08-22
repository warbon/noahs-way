import Link from "next/link"

import InquiryForm from "@/components/InquiryForm"
import Reveal from "@/components/Reveal"
import {
  emailHref,
  messengerHref,
  paymentMethods,
  phoneHref,
  siteConfig
} from "@/lib/site-config"

export default function Contact() {
  return (
    <section id="contact" className="px-5 py-24 md:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-xl shadow-primary/10 md:grid-cols-2">
        <Reveal className="relative p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(18,46,93,0.1),transparent_40%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-primary md:text-4xl">
              Book Your Next Escape
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Tell us where you&apos;re headed, when, and who&apos;s travelling.
              We&apos;ll send tailored options within 24 hours.
            </p>

            <InquiryForm />

            <p className="mt-6 text-sm text-muted-foreground">
              Prefer to talk first? Call{" "}
              <a href={phoneHref} className="font-semibold text-primary underline">
                {siteConfig.phone}
              </a>
              , email{" "}
              <a href={emailHref} className="font-semibold text-primary underline">
                {siteConfig.email}
              </a>
              , or{" "}
              <a
                href={messengerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                message us on Messenger
              </a>
              .
            </p>
          </div>
        </Reveal>

        <Reveal
          delay={140}
          className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(9,24,50,0.96),rgba(24,53,95,0.92))] p-8 text-white md:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(226,181,103,0.26),transparent_35%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              Why Book With Us
            </p>
            <div className="mt-8 space-y-5">
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-bold">Tailored Itineraries</h3>
                <p className="mt-1 text-sm text-white/80">
                  Every trip is matched to your style, pace, and budget.
                </p>
              </article>
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-bold">Reliable Support</h3>
                <p className="mt-1 text-sm text-white/80">
                  Fast response times and active guidance before and during travel.
                </p>
              </article>
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-bold">Premium Value</h3>
                <p className="mt-1 text-sm text-white/80">
                  Luxury-level experiences with transparent PHP pricing.
                </p>
              </article>
            </div>

            {/*
              Fills the run-off below the three cards, and does it with the
              question people actually stall on at this point in the page. The
              form beside it asks for their details; this answers "how would I
              even pay you" without making them go and find the policy page.
            */}
            <div className="mt-8 border-t border-white/20 pt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
                How you can pay
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
                {paymentMethods.map((method) => (
                  <li key={method.name}>{method.name}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-white/70">
                Reserve with a deposit, settle the balance before departure.{" "}
                <Link
                  href="/policies"
                  className="underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  Payment &amp; cancellation policy
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
