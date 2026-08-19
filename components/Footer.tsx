import Link from "next/link"

import { emailHref, messengerHref, phoneHref, siteConfig } from "@/lib/site-config"

const exploreLinks = [
  { href: "/packages", label: "All Packages" },
  { href: "/packages/local", label: "Local Philippines Packages" },
  { href: "/packages/international", label: "International Packages" },
  { href: "/#stories", label: "Traveler Stories" },
  { href: "/#contact", label: "Plan Your Trip" }
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

      <div className="border-t border-primary-foreground/15 px-5 py-6 text-center text-xs text-primary-foreground/70 md:px-8">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  )
}
