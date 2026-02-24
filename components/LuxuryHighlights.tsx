import Reveal from "@/components/Reveal"

export default function LuxuryHighlights() {
  const highlights = [
    {
      title: "Private Concierge",
      text: "Dedicated trip specialists from planning to return flight."
    },
    {
      title: "Curated Stays",
      text: "Boutique hotels and premium resorts selected for comfort and style."
    },
    {
      title: "Seamless Logistics",
      text: "Airport meet-and-greet, transfers, and smart itineraries handled for you."
    },
    {
      title: "Cultural Access",
      text: "Authentic experiences with trusted local hosts and guides."
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
          <h3 className="mt-4 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
            Designed for travelers who value comfort, style, and zero stress.
          </h3>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, index) => (
            <Reveal key={item.title} delay={200 + index * 110}>
              <article className="card-hover-lift rounded-2xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
                <h4 className="text-lg font-bold text-white">{item.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-white/80">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
