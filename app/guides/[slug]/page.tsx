import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import GuideBody from "@/components/GuideBody"
import Navbar from "@/components/Navbar"
import ScrollProgress from "@/components/ScrollProgress"
import { findGuide, publishedGuides } from "@/lib/guides"
import { siteConfig } from "@/lib/site-config"

type PageProps = { params: { slug: string } }

/**
 * Only published guides resolve. A draft returns a 404 rather than rendering,
 * so an unverified visa page cannot be reached by guessing the URL.
 */
function resolveGuide(slug: string) {
  const guide = findGuide(slug)
  return guide && guide.status === "published" ? guide : null
}

export function generateStaticParams() {
  return publishedGuides().map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = resolveGuide(params.slug)
  if (!guide) return { title: "Guide not found" }

  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      url: `${siteConfig.url}/guides/${guide.slug}`,
      type: "article"
    }
  }
}

function formatChecked(date: string) {
  return new Date(date).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  })
}

export default function GuidePage({ params }: PageProps) {
  const guide = resolveGuide(params.slug)
  if (!guide) notFound()

  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/guides" className="hover:underline">
                  Guides
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground">
                {guide.title}
              </li>
            </ol>
          </nav>

          <header className="mt-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/70">
              {guide.question}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-primary md:text-4xl">{guide.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{guide.summary}</p>
            {/*
              Stated up front, not buried in a footer. Rules with dates on them
              are only useful if the reader can see how old the answer is.
            */}
            <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
              Rules and fees on this page were last checked on{" "}
              <time dateTime={guide.factsCheckedOn} className="font-semibold text-foreground">
                {formatChecked(guide.factsCheckedOn)}
              </time>
              . Requirements change — always confirm with the embassy before you travel.
            </p>
          </header>

          <article className="mt-10">
            <GuideBody blocks={guide.body} />
          </article>

          {guide.relatedPackageSlug ? (
            <section className="mt-12 rounded-2xl border border-primary/15 bg-primary p-7 text-primary-foreground">
              <h2 className="text-xl font-bold">Want this handled for you?</h2>
              <p className="mt-2 max-w-prose text-primary-foreground/80">
                {guide.relatedPackageLabel}
              </p>
              <Link
                href={guide.relatedPackageSlug}
                className="mt-5 inline-flex items-center rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/90"
              >
                See the package
              </Link>
            </section>
          ) : null}

          <section aria-labelledby="sources-heading" className="mt-12 border-t border-border pt-6">
            <h2 id="sources-heading" className="text-sm font-bold text-primary">
              Sources
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {guide.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
