import Link from "next/link"

import {
  accreditations,
  emailHref,
  messengerHref,
  phoneHref,
  siteConfig
} from "@/lib/site-config"

const exploreLinks = [
  { href: "/packages", label: "All Packages" },
  { href: "/packages/local", label: "Local Philippines Packages" },
  { href: "/packages/international", label: "International Packages" },
  { href: "/guides", label: "Travel Guides" },
  { href: "/about", label: "About Us" },
  { href: "/#stories", label: "Traveler Stories" },
  { href: "/#contact", label: "Plan Your Trip" },
  { href: "/policies", label: "Payment & Cancellation" }
]

export default function Footer() {
  const { address } = siteConfig
  const addressLine = [address.street, address.city, address.region, address.postalCode]
    .filter(Boolean)
    .join(", ")

  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8">
        <div>
          <p className="text-lg font-bold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-primary-foreground/70">{siteConfig.tagline}</p>
          <p className="mt-4 text-sm text-primary-foreground/70">{siteConfig.hours}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Explore
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-primary-foreground/85 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Contact
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={phoneHref} className="text-primary-foreground/85 hover:underline">
                {siteConfig.phone}
              </a>
            </li>
            <li>
              <a href={emailHref} className="text-primary-foreground/85 hover:underline">
                {siteConfig.email}
              </a>
            </li>
            <li>
              <a
                href={messengerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/85 hover:underline"
              >
                Messenger
              </a>
            </li>
            {siteConfig.facebookUrl ? (
              <li>
                <a
                  href={siteConfig.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-foreground/85 hover:underline"
                >
                  Facebook
                </a>
              </li>
            ) : null}
            {addressLine ? (
              <li className="pt-2 text-primary-foreground/70">{addressLine}</li>
            ) : null}
          </ul>
        </div>
      </div>

      {/*
        Registrations sit in the footer of every page on purpose: Philippine
        buyers are told to verify these before paying a travel agency, so making
        them hunt for the numbers costs bookings.
      */}
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
            Registered &amp; accredited
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-3">
            {accreditations.map((item) => {
              const published = item.value.trim() !== ""
              return (
                <li key={item.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
                    {item.label}
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      published
                        ? "text-primary-foreground"
                        : "italic text-primary-foreground/45"
                    }`}
                  >
                    {published ? item.value : "To be added"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-primary-foreground/60">
                    {item.note}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-6 text-xs text-primary-foreground/60">
            <Link
              href="/policies"
              className="underline underline-offset-4 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              Payment &amp; cancellation policy
            </Link>
          </p>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15 px-5 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-6 text-center text-xs text-primary-foreground/70 md:px-8 md:pb-6">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  )
}
