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
  /**
   * Country name, bare of any article — it is interpolated into headings like
   * "Our {name} trips", where a leading "the" reads as a mistake.
   */
  name: string
  /** Matched against each package's `destination` field. */
  match: RegExp
  tagline: string
  /**
   * Overrides the "{name} from the Philippines" headline. Needed for the
   * domestic page, where that template reads as nonsense.
   */
  headline?: string
  summary: string
  /** The visa position, in one line. Detail lives in the guides. */
  visa: { needed: boolean; line: string }
  whatItIsLike: string[]
  whenToGo: { season: string; detail: string }[]
  goodFor: string
}

export const destinations: Destination[] = [
  {
    slug: "philippines",
    name: "Philippines",
    headline: "Travelling around the Philippines",
    match: /philippines|boracay|palawan|el nido|coron|cebu|bohol|siargao|baguio|batanes|davao|iloilo|camiguin|sagada|la union|bacolod|dumaguete|vigan|zambales|puerto princesa/i,
    tagline: "No passport, no visa, and the season matters more than the island",
    summary:
      "Home is the easiest trip to take and the one most often planned badly — because the country does not have one weather season, it has several, and they run at different times depending on which island you pick.",
    visa: {
      needed: false,
      line: "Domestic travel. A valid government ID is enough — no passport, no visa, and no travel tax."
    },
    whatItIsLike: [
      "Palawan is the postcard — El Nido lagoons, Coron wrecks — and the most fee-heavy to visit, so budget past the airfare.",
      "Cebu and Bohol pair a city with a countryside easily, which is why they work well for a first domestic trip with family.",
      "Siargao and the rest of Mindanao sit largely outside the main typhoon belt, which makes them the sensible pick when the rest of the country is under habagat."
    ],
    whenToGo: [
      {
        season: "Amihan, November to April",
        detail: "The northeast monsoon and the dry season for most of the country. December to February is the most reliable stretch, and also the most expensive and crowded."
      },
      {
        season: "Habagat, May to October",
        detail: "The southwest monsoon. Cheaper and quieter, but boat trips get choppy, underwater visibility drops with river runoff, and remote destinations can become hard to reach."
      },
      {
        season: "Typhoon season, peaking July to October",
        detail: "Worst in the north and along exposed east coasts. Palawan, the southern Visayas and Mindanao are markedly less exposed — the country is not uniformly off-limits in these months."
      }
    ],
    goodFor:
      "Anyone who wants a trip without paperwork, families travelling with young children, and last-minute plans that a visa timeline would rule out."
  },
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
