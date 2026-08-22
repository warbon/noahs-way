import Link from "next/link"

import Reveal from "@/components/Reveal"
import { publishedGuides } from "@/lib/guides"

/**
 * A few guides on the homepage.
 *
 * Sits between the packages and the enquiry form on purpose. A visitor who has
 * scrolled past the catalogue without clicking is usually not ready to buy —
 * meeting them with a booking form is the wrong ask, and meeting them with the
 * visa or offloading answer they came looking for is the right one.
 *
 * Leads with each guide's question rather than its title, because the question
 * is what the reader recognises as their own.
 */
export default function GuidesPreview() {
  const guides = publishedGuides().slice(0, 3)

  // Nothing published yet means no section, rather than an empty heading.
  if (guides.length === 0) return null

  return (
    <section className="bg-muted/40 px-5 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Travel guides
            </p>
            <h2 className="mt-2 text-3xl font-bold text-primary md:text-4xl">
              Not ready to book? Start here.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Straight answers on visas, the immigration counter, and the fees nobody mentions —
              useful whether or not you travel with us.
            </p>
          </div>
          <Link
            href="/guides"
            className="inline-flex items-center rounded-full border border-primary/15 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            All guides
          </Link>
        </Reveal>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {guides.map((guide, index) => (
            <li key={guide.slug}>
              <Reveal delay={120 + index * 110}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="card-hover-lift flex h-full flex-col rounded-2xl border border-primary/10 bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {guide.question}
                  </p>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-primary">
                    {guide.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{guide.summary}</p>
                  <span className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                    Read the guide
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
