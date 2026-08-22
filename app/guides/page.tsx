import type { Metadata } from "next"
import Link from "next/link"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { publishedGuides } from "@/lib/guides"

export const metadata: Metadata = {
  title: "Travel Guides",
  description:
    "Straight answers on visas, Philippine immigration, and what an overseas trip really costs — written for Filipino travellers.",
  alternates: { canonical: "/guides" }
}

export default function GuidesIndexPage() {
  const guides = publishedGuides()

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                Guides
              </li>
            </ol>
          </nav>

          <header className="mt-6 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/70">
              Travel guides
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">
              The things people ask before they book
            </h1>
            <p className="mt-4 text-muted-foreground">
              Visas, the immigration counter, and what a trip actually costs once every fee is
              counted. Written for Filipino travellers, and kept dated so you know how current it
              is.
            </p>
          </header>

          {guides.length > 0 ? (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {guides.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="card-hover-lift flex h-full flex-col rounded-2xl border border-primary/10 bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {guide.question}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-primary">{guide.title}</h2>
                    <p className="mt-3 flex-1 text-sm text-muted-foreground">{guide.summary}</p>
                    <span className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-accent">
                      Read the guide
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            /*
              The first guides are drafted but not verified. An empty index is
              the honest state — better than publishing visa rules nobody has
              checked against the embassy.
            */
            <section className="mt-10 rounded-2xl border border-dashed border-primary/20 bg-card p-8 text-center">
              <h2 className="text-xl font-bold text-primary">Guides are on the way</h2>
              <p className="mx-auto mt-3 max-w-prose text-sm text-muted-foreground">
                We&apos;re writing these now. In the meantime, ask us anything about visas,
                immigration or costs — we answer the same questions every day and we&apos;re happy
                to answer yours.
              </p>
              <Link
                href="/#contact"
                className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                Ask us a question
              </Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
