import Reveal from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Contact() {
  return (
    <section id="contact" className="px-5 py-24 md:px-8">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-xl shadow-primary/10 md:grid-cols-2">
        <Reveal className="relative p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(18,46,93,0.1),transparent_40%)]" />
          <div className="relative">
            <h3 className="text-3xl font-bold text-primary md:text-4xl">
              Plan Your Next Escape
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Share your dates, preferred destination, and budget range in PHP.
              We&apos;ll send tailored options within 24 hours.
            </p>

            <div className="mt-8 space-y-4">
              <Input placeholder="Full Name" />
              <Input type="email" placeholder="Email Address" />
              <Input placeholder="Target Budget (PHP)" />
              <Textarea placeholder="Destination, travel dates, and preferred activities" />
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Send Inquiry
              </Button>
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={140}
          className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(9,24,50,0.96),rgba(24,53,95,0.92))] p-8 text-white md:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(226,181,103,0.26),transparent_35%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
              Why Book With Us
            </p>
            <div className="mt-8 space-y-5">
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h4 className="font-bold">Tailored Itineraries</h4>
                <p className="mt-1 text-sm text-white/80">
                  Every trip is matched to your style, pace, and budget.
                </p>
              </article>
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h4 className="font-bold">Reliable Support</h4>
                <p className="mt-1 text-sm text-white/80">
                  Fast response times and active guidance before and during travel.
                </p>
              </article>
              <article className="card-hover-lift rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <h4 className="font-bold">Premium Value</h4>
                <p className="mt-1 text-sm text-white/80">
                  Luxury-level experiences with transparent PHP pricing.
                </p>
              </article>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
