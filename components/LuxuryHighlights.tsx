import Reveal from "@/components/Reveal"

/**
 * Claims here must be true of the packages actually on sale.
 *
 * The previous copy promised "boutique hotels and premium resorts" while the
 * catalogue sells a 3-star twin-share in Seoul and a local four-star in Da
 * Nang. Wording that the product cannot back is a consumer-protection problem,
 * not a tone problem, so each line below is now something every published
 * package genuinely does.
 */
export default function LuxuryHighlights() {
  const highlights = [
    {
      title: "One team, start to finish",
      text: "The same trip specialist from your first question to your return flight."
    },
    {
      title: "Vetted hotels, twin sharing",
      text: "Every stay named in the itinerary before you book, with its tier stated plainly."
    },
    {
      title: "Transfers handled",
      text: "Airport pickup, coach transport and the day-to-day moving about, all arranged."
    },
    {
      title: "Guided, not herded",
      text: "Small-group departures with a local guide who knows the route."
    }
  ]

  return (
    <section className="relative overflow-hidden px-5 py-20 md:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(9,25,53,0.95),rgba(21,45,81,0.94))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(226,181,103,0.22),transparent_32%)]" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-secondary">
            Signature Experience
          </p>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            Designed for travelers who value comfort, style, and zero stress.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, index) => (
            <Reveal key={item.title} delay={200 + index * 110}>
              <article className="card-hover-lift rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/80">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
