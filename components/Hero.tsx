"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useState } from "react"

import BrandLogo from "@/components/BrandLogo"
import Reveal from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-config"

const heroSlides = [
  {
    eyebrow: "Noah's Way Signature Journeys",
    title: "Curated Escapes.",
    subtitle: "Beyond First Class.",
    description:
      "Immersive luxury itineraries across Singapore, Japan, and Korea with private guides, handpicked stays, and seamless transfers.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=80",
    route: "Singapore • Tokyo • Seoul",
    highlights: ["5-Star Partner Hotels", "Private Airport Transfers", "24/7 Trip Concierge"]
  },
  {
    eyebrow: "Bespoke Honeymoon Collection",
    title: "Romantic Voyages.",
    subtitle: "Planned to the Minute.",
    description:
      "Private sunset cruises, resort upgrades, and personalized experiences designed for couples who want luxury without planning friction.",
    image:
      "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=2200&q=80",
    route: "Bali • Kyoto • Jeju",
    highlights: ["Suite Upgrades", "Private Dining", "Dedicated Trip Manager"]
  },
  {
    eyebrow: "Family Luxury Adventures",
    title: "Seamless Trips.",
    subtitle: "For Every Generation.",
    description:
      "Multi-stop family itineraries with child-friendly pacing, premium accommodations, and concierge-backed support before and during travel.",
    image:
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2200&q=80",
    route: "Osaka • Busan • Sentosa",
    highlights: ["Flexible Schedules", "Private Transfers", "Handpicked Activities"]
  }
] as const

export default function Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isManuallyPaused, setIsManuallyPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const activeSlide = heroSlides[activeIndex]

  // Start paused when the visitor asked for reduced motion.
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
    // WCAG 2.2.2: auto-advancing content must be pausable, and must not move
    // while the visitor is hovering or tabbing through it.
    if (isPaused || prefersReducedMotion) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroSlides.length)
    }, 6500)

    return () => window.clearInterval(intervalId)
  }, [isPaused, prefersReducedMotion])

  // Resume only when the visitor hasn't asked for reduced motion, and only if
  // they didn't explicitly pause via the control (that stays sticky until toggled).
  const resumeUnlessReducedMotion = () => {
    if (!prefersReducedMotion && !isManuallyPaused) setIsPaused(false)
  }

  const goToPrev = () => {
    setActiveIndex((current) => (current - 1 + heroSlides.length) % heroSlides.length)
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % heroSlides.length)
  }

  return (
    <section
      className="relative isolate min-h-[78vh] overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured journeys"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={resumeUnlessReducedMotion}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={resumeUnlessReducedMotion}
    >
      {heroSlides.map((slide, index) => (
        <div
          key={slide.image}
          aria-hidden={index !== activeIndex}
          className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
            index === activeIndex
              ? "animate-kenburns-slow opacity-100 scale-100"
              : "opacity-0 scale-[1.03]"
          }`}
          style={{
            backgroundColor: "#0b1b34",
            backgroundImage: `url('${slide.image}')`
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(7,14,28,0.88),rgba(7,14,28,0.62)_45%,rgba(7,14,28,0.25)_78%,rgba(7,14,28,0.68))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(231,189,110,0.25),transparent_36%)]" />
      <div className="absolute left-[8%] top-[18%] h-16 w-16 animate-float-slow rounded-full border border-white/25 bg-white/10 blur-[1px]" />
      <div className="absolute bottom-[18%] right-[10%] h-24 w-24 animate-float-slow rounded-full border border-secondary/45 bg-secondary/15 [animation-delay:1.2s]" />

      <div className="relative mx-auto grid max-w-7xl items-end gap-10 px-5 py-20 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-28">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-secondary">
            {activeSlide.eyebrow}
          </p>
          <h1 className="sr-only">
            {siteConfig.name} — {siteConfig.tagline}
          </h1>
          <p
            aria-live="polite"
            className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-6xl"
          >
            {activeSlide.title}
            <br />
            {activeSlide.subtitle}
          </p>
          <p className="mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            {activeSlide.description}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href="#packages">
              <Button
                size="lg"
                className="bg-accent px-8 text-accent-foreground transition hover:-translate-y-0.5 hover:bg-accent/90"
              >
                Explore Packages
              </Button>
            </a>
            <a href="#contact">
              <Button
                variant="outline"
                size="lg"
                className="border-white/50 bg-white/10 px-8 text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Get a Quote
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/85">
            {activeSlide.highlights.map((highlight) => (
              <span key={highlight}>{highlight}</span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous hero slide"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition hover:bg-white/20"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next hero slide"
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
              {isPaused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
            </button>
            <div className="ml-1 flex items-center gap-2">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.route}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  className={`h-2.5 rounded-full transition ${
                    index === activeIndex ? "w-8 bg-secondary" : "w-2.5 bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={140}
          className="rounded-3xl border border-white/30 bg-white/15 p-7 backdrop-blur-sm"
        >
          <div className="rounded-2xl bg-white p-6 shadow-xl shadow-black/20">
            <BrandLogo />
          </div>
          <p className="mt-4 text-center text-sm uppercase tracking-[0.22em] text-white/85">
            Bespoke Travel Atelier
          </p>
          <div className="mt-5 rounded-2xl border border-white/20 bg-black/20 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Featured Route</p>
            <p className="mt-2 text-lg font-semibold">{activeSlide.route}</p>
            <p className="mt-2 text-sm text-white/75">Slide {activeIndex + 1} of {heroSlides.length}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
