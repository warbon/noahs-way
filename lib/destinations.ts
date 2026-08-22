/**
 * Country-level pages, sitting above the package pages.
 *
 * They catch a different moment. A package page answers "is this trip right
 * for me"; these answer "where should I even go", which happens earlier and to
 * many more people. Neither the catalogue nor the guides addressed it.
 *
 * Packages are matched to a destination by pattern rather than listed by hand,
 * so a new trip appears on the right page the moment it is published.
 */

export type Destination = {
  slug: string
  /** Country name, as a traveller would say it. */
  name: string
  /** Matched against each package's `destination` field. */
  match: RegExp
  tagline: string
  summary: string
  /** The visa position, in one line. Detail lives in the guides. */
  visa: { needed: boolean; line: string }
  whatItIsLike: string[]
  whenToGo: { season: string; detail: string }[]
  goodFor: string
}

export const destinations: Destination[] = [
  {
    slug: "vietnam",
    name: "Vietnam",
    match: /vietnam|hanoi|sapa|da nang|hoi an/i,
    tagline: "No visa, and the shortest route to a first trip abroad",
    summary:
      "Vietnam asks least of a Philippine passport of anywhere we run trips to — no visa, 21 days, and a flight short enough to leave and return in the same week. It is the trip we most often suggest to someone who has never travelled abroad before.",
    visa: {
      needed: false,
      line: "No visa needed for Philippine passport holders, for stays of up to 21 days."
    },
    whatItIsLike: [
      "The north around Hanoi and Sapa is mountains and terraced valleys, cooler than home, and the Fansipan cable car goes up the highest peak in Indochina.",
      "The centre around Da Nang and Hoi An is coastline, an old trading town lit with lanterns, and the Ba Na Hills cable car up to the Golden Bridge.",
      "Food is a reason to go on its own, and it stays inexpensive even where the hotels are not."
    ],
    whenToGo: [
      {
        season: "Dry months",
        detail: "Central Vietnam is at its most reliable from roughly February to May, which is when our Da Nang departures run."
      },
      {
        season: "Northern winter",
        detail: "Sapa gets genuinely cold, occasionally close to freezing. Pack for it — travellers from the Philippines routinely under-dress for this."
      }
    ],
    goodFor:
      "First-time travellers, families watching the budget, and anyone who wants the paperwork to be simple."
  },
  {
    slug: "south-korea",
    name: "South Korea",
    match: /korea|seoul|nami|incheon|seorak|jeju/i,
    tagline: "Four distinct seasons, and a visa worth planning around",
    summary:
      "Korea is the trip people ask us about most, and the one with the most preparation attached. The seasons are genuinely different from each other, so when you go changes what you get — and unlike Vietnam, you will need a visa for the mainland.",
    visa: {
      needed: true,
      line: "A C-3-9 tourist visa is required for the mainland. Allow up to ten working days for processing."
    },
    whatItIsLike: [
      "Seoul carries palaces, night markets and a subway that makes the city easy without a car.",
      "Nami Island, Mt. Seorak and Everland are the day trips our departures build around, all reachable from the city.",
      "It is a walking country. Comfortable shoes matter more than most people expect."
    ],
    whenToGo: [
      {
        season: "Autumn, October to November",
        detail: "Foliage season, and the most photographed time of year. Our Autumn Holidays departures sit here, and it books up earliest."
      },
      {
        season: "Winter, into March",
        detail: "Snow, ski resorts and ice valleys. The Seoul-D departures are built for this, and it is cold in a way that needs real preparation."
      },
      {
        season: "Late spring and summer",
        detail: "Warmer and greener, with fewer crowds at the palaces than autumn brings."
      }
    ],
    goodFor:
      "Travellers who want a city trip with day trips attached, and anyone chasing a particular season rather than just a destination."
  }
]

export function findDestination(slug: string) {
  return destinations.find((destination) => destination.slug === slug) ?? null
}
