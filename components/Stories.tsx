import Reveal from "@/components/Reveal"

type Testimonial = {
  quote: string
  name: string
  trip: string
  /**
   * Only a review from a real, identifiable customer is publishable.
   *
   * Publishing invented testimonials is deceptive advertising, not decoration —
   * and these three name trips the catalogue has never sold, so a customer
   * comparing them against the packages would catch it. They stay in the file
   * as placeholders to be replaced, and the section below renders nothing until
   * at least one is marked verified.
   */
  verified: boolean
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Noah's Way handled every detail. We just showed up and enjoyed Japan in total comfort.",
    name: "Angela R.",
    trip: "Tokyo + Kyoto",
    verified: false
  },
  {
    quote: "The Palawan package felt premium from airport pickup to the final sunset dinner.",
    name: "Marco and Liza T.",
    trip: "El Nido",
    verified: false
  },
  {
    quote: "Fast responses, elegant hotels, and perfectly planned schedules. Highly recommended.",
    name: "Denise C.",
    trip: "Seoul",
    verified: false
  }
]

const publishable = testimonials.filter((item) => item.verified)

/**
 * Initials from the first and last word of the name — "Angela R." reads AR.
 *
 * Derived from the name that is already shown, so the monogram adds visual
 * anchoring without implying a photo or a rating we don't have. Deliberately no
 * star ratings or "verified" marks here: inventing those would manufacture
 * exactly the credibility this section is meant to earn honestly.
 */
function initialsFor(name: string) {
  const words = name.replace(/\band\b/gi, " ").split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ""
  return (first + last).toUpperCase()
}

export default function Stories() {
  // Nothing to show is better than something invented. The nav entries for
  // this section were removed alongside it and come back with the first real
  // review.
  if (publishable.length === 0) return null

  return (
    <section id="stories" className="bg-muted/40 px-5 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center text-3xl font-bold text-primary md:text-4xl">
            Traveler Stories
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Real trips. Real memories. Real peace of mind.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {publishable.map((item, index) => (
            <Reveal key={item.name} delay={220 + index * 120}>
              <figure className="card-hover-lift flex h-full flex-col rounded-2xl border border-primary/10 bg-card p-7 shadow-lg shadow-primary/5">
                {/*
                  Decorative glyph, not content — the quotation itself is marked
                  up as a blockquote, so nothing is lost to a screen reader.
                */}
                <span
                  aria-hidden="true"
                  className="block font-serif text-6xl leading-[0.6] text-accent/35"
                >
                  &ldquo;
                </span>

                <blockquote className="mt-5 flex-1">
                  <p className="text-lg leading-relaxed text-foreground/90">{item.quote}</p>
                </blockquote>

                <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold tracking-wide text-primary-foreground"
                  >
                    {initialsFor(item.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-primary">
                      {item.name}
                    </span>
                    <span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {item.trip}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
