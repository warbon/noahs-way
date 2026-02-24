import Reveal from "@/components/Reveal"

export default function Stories() {
  const testimonials = [
    {
      quote:
        "Noah's Way handled every detail. We just showed up and enjoyed Japan in total comfort.",
      name: "Angela R.",
      trip: "Tokyo + Kyoto"
    },
    {
      quote:
        "The Palawan package felt premium from airport pickup to the final sunset dinner.",
      name: "Marco and Liza T.",
      trip: "El Nido"
    },
    {
      quote:
        "Fast responses, elegant hotels, and perfectly planned schedules. Highly recommended.",
      name: "Denise C.",
      trip: "Seoul"
    }
  ]

  return (
    <section id="stories" className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h3 className="text-center text-3xl font-bold text-primary md:text-4xl">
            Traveler Stories
          </h3>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Real trips. Real memories. Real peace of mind.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal key={item.name} delay={220 + index * 120}>
              <article className="card-hover-lift rounded-2xl border border-primary/15 bg-white p-6 shadow-lg shadow-primary/10">
                <p className="text-base leading-relaxed text-foreground/85">“{item.quote}”</p>
                <p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-primary">
                  {item.name}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {item.trip}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
