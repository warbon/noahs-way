"use client"

import Image from "next/image"
import Link from "next/link"
import { Pause, Play } from "lucide-react"
import { useEffect, useState } from "react"

import Reveal from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import type { PackageRecord } from "@/lib/package-repository-types"
import { buildPackageHref, derivePackageSlug } from "@/lib/package-slug"
import { formatDuration, formatPackagePrice } from "@/lib/price"
import { siteConfig } from "@/lib/site-config"

/**
 * The hero is driven by the live catalog rather than a hardcoded slide list.
 *
 * The previous version advertised Bali, Kyoto, Jeju, Osaka and Sentosa over
 * stock beach photography — none of which were purchasable — so a visitor drawn
 * in by Kyoto found no Kyoto and left. Sourcing the slides from published
 * packages makes that failure structurally impossible.
 *
 * It also drops three remote 2200px background images that all downloaded on
 * first paint (two of them invisible) and bypassed image optimisation entirely.
 * The poster is the artwork the business already paid a designer for, and
 * showing it portrait is the first time it renders at its real aspect ratio.
 */
const ROTATE_MS = 7000

/**
 * Only the eyebrow changes per slide. The headline stays fixed so it doesn't
 * reflow on every rotation, and it claims the one thing that now separates this
 * site from the agencies it competes with: the itinerary is on the page, not
 * behind an enquiry.
 */
const COLLECTIONS: { match: RegExp; eyebrow: string }[] = [
  { match: /vietnam|hanoi|sapa|da nang/i, eyebrow: "Vietnam Collection" },
  { match: /korea|seoul|nami/i, eyebrow: "Korea Collection" }
]

function eyebrowFor(title: string) {
  return COLLECTIONS.find((entry) => entry.match.test(title))?.eyebrow ?? "Signature Journeys"
}

export default function Hero({ packages }: { packages: PackageRecord[] }) {
  const slides = packages.slice(0, 4)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isManuallyPaused, setIsManuallyPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      setPrefersReducedMotion(query.matches)
      if (query.matches) setIsPaused(true)
    }
    apply()
    query.addEventListener("change", apply)
    return () => query.removeEventListener("change", apply)
  }, [])

  useEffect(() => {
    // WCAG 2.2.2: auto-advancing content must be pausable and must not move
    // while the visitor is hovering or tabbing through it.
    if (isPaused || prefersReducedMotion || slides.length < 2) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, ROTATE_MS)

    return () => window.clearInterval(intervalId)
  }, [isPaused, prefersReducedMotion, slides.length])

  // An empty catalog should not render a broken carousel.
  if (slides.length === 0) return null

  const active = slides[activeIndex]
  const eyebrow = eyebrowFor(active.title)
  const slug = active.slug ?? derivePackageSlug(active)
  const href = buildPackageHref(active.category, slug)
  const duration = formatDuration(active.durationDays, active.durationNights)

  const resumeUnlessReducedMotion = () => {
    if (!prefersReducedMotion && !isManuallyPaused) setIsPaused(false)
  }

  const goToPrev = () =>
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  const goToNext = () => setActiveIndex((current) => (current + 1) % slides.length)

  return (
    <section
      className="relative isolate overflow-hidden bg-primary"
      aria-roledescription="carousel"
      aria-label="Featured packages"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={resumeUnlessReducedMotion}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={resumeUnlessReducedMotion}
    >
      <div className="absolute inset-0 bg-[linear-gradient(140deg,#0b1b34_0%,#132D4E_48%,#1c3c66_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(235,167,51,0.22),transparent_42%)]" />
      <div className="absolute left-[7%] top-[16%] h-16 w-16 animate-float-slow rounded-full border border-white/20 bg-white/5 blur-[1px]" />
      <div className="absolute bottom-[16%] right-[8%] h-24 w-24 animate-float-slow rounded-full border border-secondary/35 bg-secondary/10 [animation-delay:1.2s]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:gap-12 px-5 py-10 md:px-8 md:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-secondary">
            {eyebrow}
          </p>

          <h1 className="mt-4 max-w-[15ch] text-4xl font-bold leading-[1.05] text-white md:text-6xl">
            See the whole itinerary before you book.
          </h1>

          {/*
            The headline stays put while the slide changes; only this line and
            the card swap. Screen readers hear the change once, on the
            destination itself, instead of the whole hero re-announcing every
            seven seconds.
          */}
          <p aria-live="polite" className="mt-5 max-w-xl text-base text-white/85 md:mt-6 md:text-xl">
            {active.summary ?? active.details}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href={href}>
              <Button
                size="lg"
                className="bg-accent px-8 text-accent-foreground transition hover:-translate-y-0.5 hover:bg-accent/90"
              >
                See this trip
              </Button>
            </Link>
            <Link href="/packages">
              <Button
                variant="outline"
                size="lg"
                className="border-white/50 bg-white/10 px-8 text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                All packages
              </Button>
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-7 gap-y-1.5 text-sm text-white/85 md:mt-10">
            <li>Roundtrip airfare included</li>
            <li>English-speaking guide</li>
            <li>Full itinerary published</li>
          </ul>

        </Reveal>

        {/*
          Replaces a glass panel that showed the logo already sitting in the
          header. This slot now carries the thing a visitor can act on: what the
          trip is, what it costs, and a way in.
        */}
        <Reveal delay={140} className="justify-self-center lg:justify-self-end">
          <Link
            href={href}
            className="group block w-[min(340px,80vw)] rounded-3xl border border-white/25 bg-white/10 p-4 backdrop-blur-sm transition hover:-translate-y-1 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {/*
              Every poster stays mounted and the active one is simply shown.
              Two failure modes had to be avoided at once: cross-fading the
              stack left the outgoing poster visible while the title and price
              had already changed — the wrong poster on the wrong package, the
              exact defect this catalogue was cleaned up to remove — while
              rendering only the active one refetched on each rotation and left
              the frame empty mid-swap. Mounted, with no transition, the image
              changes in the same commit as the text and is already cached.
            */}
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-primary">
              {slides.map((slide, index) => (
                <Image
                  key={slide.id}
                  src={slide.previewImage}
                  alt={index === activeIndex ? slide.imageAlt ?? `${slide.title} package poster` : ""}
                  fill
                  sizes="(max-width: 1024px) 80vw, 340px"
                  priority={index === 0}
                  aria-hidden={index !== activeIndex}
                  className={`object-cover ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
                />
              ))}
            </div>
            <div className="px-2 pb-1 pt-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                {active.destination ?? "Featured package"}
              </p>
              <p className="mt-2 text-lg font-bold leading-tight">{active.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
                  {formatPackagePrice(active)}
                </span>
                {duration ? (
                  <span className="text-sm text-white/80">{duration}</span>
                ) : null}
              </div>
              <span className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-secondary transition group-hover:text-accent">
                View itinerary
              </span>
            </div>
          </Link>
        </Reveal>
        {/*
          Their own row rather than tucked under the copy: stacked on a phone the
          controls used to sit between the pitch and the card that answers it,
          splitting one message in two and pushing the product further down.
        */}
          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous package"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next package"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
          >
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsManuallyPaused((paused) => !paused)
              setIsPaused((paused) => !paused)
            }}
            aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
          >
            {isPaused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <div className="ml-1 flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${slide.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`h-2.5 rounded-full transition ${
                  index === activeIndex
                    ? "w-8 bg-secondary"
                    : "w-2.5 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </p>
    </section>
  )
}
