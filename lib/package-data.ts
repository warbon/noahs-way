import type { PackageFee } from "@/lib/package-fees"

export type PackageCategory = "local" | "international"

export type ItineraryDay = {
  day: number
  title: string
  description?: string
  activities?: string[]
}

export type PackageStatus = "published" | "draft"

/**
 * The original seven fields stay required so all existing records keep
 * validating. Everything added since is optional — a record missing them is
 * incomplete, never invalid.
 */
export type TravelPackage = {
  category: PackageCategory
  title: string
  details: string
  previewImage: string
  imagePath: string
  price: string
  // Structured fields. Absent on legacy records; filled in via the admin editor.
  slug?: string
  /** Absent means "published" — legacy records stay visible by default. */
  status?: PackageStatus
  destination?: string
  summary?: string
  priceAmount?: number
  currency?: string
  durationDays?: number
  durationNights?: number
  highlights?: string[]
  /** Departure windows as printed on the poster, e.g. "Mar 04–08 (+₱5,000/pax)". */
  travelPeriods?: string[]
  itinerary?: ItineraryDay[]
  inclusions?: string[]
  exclusions?: string[]
  /**
   * The exclusions above, with amounts, so a total can be computed. The prose
   * stays authoritative — this is the machine-readable companion to it.
   */
  fees?: PackageFee[]
  imageAlt?: string
  /**
   * Set by Admin -> Packages -> "Post to Facebook", never by the package form.
   *
   * Their presence is what tells an admin a package has already been announced,
   * so a second click is a deliberate re-post rather than an accident. The id is
   * Facebook's `{page-id}_{post-id}`; the permalink is stored beside it because
   * reading it back needs the Page token, which the browser never sees.
   */
  facebookPostId?: string
  facebookPostedAt?: string
  facebookPermalink?: string
  /**
   * Set once, when the record is created. Absent on everything seeded before
   * the field existed — there is no honest way to date those, so the admin
   * list sorts them below the records that do carry one rather than guessing.
   */
  createdAt?: string
  updatedAt?: string
}

export const PACKAGE_PAGE_SIZE = 6

export const packageCategoryMeta: Record<
  PackageCategory,
  { title: string; shortLabel: string; description: string }
> = {
  local: {
    title: "Local Philippines Packages",
    shortLabel: "Local",
    description: "Curated Philippines trips with premium stays and guided experiences."
  },
  international: {
    title: "International Packages",
    shortLabel: "International",
    description: "Handpicked overseas itineraries designed for seamless premium travel."
  }
}

type PackageSeed = Omit<TravelPackage, "category" | "title">

const localSeeds: PackageSeed[] = [
  {
    details: "4 Days / 3 Nights • Beachfront resort • Island hopping",
    previewImage: "/images/packages/local/boracay-luxe-escape.jpg",
    imagePath: "/images/packages/local/boracay-luxe-escape.jpg",
    price: "from PHP 24,900"
  },
  {
    details: "5 Days / 4 Nights • El Nido lagoons • Private boat day",
    previewImage: "/images/packages/local/palawan-premium.jpg",
    imagePath: "/images/packages/local/palawan-premium.jpg",
    price: "from PHP 32,500"
  },
  {
    details: "5 Days / 4 Nights • City stay • Countryside + marine tour",
    previewImage: "/images/packages/local/cebu-bohol-signature.jpg",
    imagePath: "/images/packages/local/cebu-bohol-signature.jpg",
    price: "from PHP 29,800"
  }
]

const internationalSeeds: PackageSeed[] = [
  {
    details: "4 Days / 3 Nights • Marina Bay stay • Private city guide",
    previewImage: "/images/packages/international/singapore-adventure.jpg",
    imagePath: "/images/packages/international/singapore-adventure.jpg",
    price: "from PHP 88,900"
  },
  {
    details: "5 Days / 4 Nights • Palace district tour • Premium food trail",
    previewImage: "/images/packages/international/seoul-202601jpg.jpg",
    imagePath: "/images/packages/international/seoul-202601jpg.jpg",
    price: "from PHP 104,500"
  },
  {
    details: "6 Days / 5 Nights • Tokyo + Kyoto • Ryokan & fast-rail pass",
    previewImage: "/images/packages/international/japan-classic.jpg",
    imagePath: "/images/packages/international/japan-classic.jpg",
    price: "from PHP 136,000"
  },
  {
    details: "5 Days / 4 Nights • Downtown hotel • Desert safari VIP",
    previewImage: "/images/packages/international/dubai-gold-collection.jpg",
    imagePath: "/images/packages/international/dubai-gold-collection.jpg",
    price: "from PHP 118,900"
  }
]

const localTitles = [
  "Boracay Luxe Escape",
  "Palawan Premium",
  "Cebu & Bohol Signature",
  "Siargao Surf & Spa Retreat",
  "Baguio Highland Weekend",
  "Vigan Heritage Escape",
  "Davao Mountain & City Blend",
  "Iloilo-Guimaras Gourmet Trail",
  "Batanes Scenic Hideaway",
  "Bicol Volcano Coastline Tour",
  "Camiguin Island Wellness Stay",
  "Sagada Pine & Caves Journey",
  "La Union Beach Reset",
  "Coron Yacht Weekender",
  "Bohol Family Discovery",
  "Bacolod Sugarland Getaway",
  "Cagayan de Oro Adventure Pack",
  "Dumaguete Apo Island Escape",
  "Zambales Glamping Seaside",
  "Puerto Princesa Underground River Classic"
] as const

const internationalTitles = [
  "Singapore Adventure",
  "Seoul Discovery",
  "Japan Classic",
  "Dubai Gold Collection",
  "Bangkok City & River Luxe",
  "Hong Kong Skyline Escape",
  "Bali Villa Indulgence",
  "Taipei Night Market Discovery",
  "Istanbul Heritage & Bosphorus",
  "Paris Landmark Collection",
  "Swiss Alpine Panorama",
  "London Royal Weekend",
  "Rome & Florence Art Trail",
  "Sydney Harbor Signature",
  "Auckland Scenic Explorer",
  "Barcelona Mediterranean Break",
  "Prague Old Town Romance",
  "New York City Premium Stay",
  "Vancouver Mountain & City",
  "Doha Desert and Downtown Select"
] as const

function buildSamplePackages(
  category: PackageCategory,
  titles: readonly string[],
  seeds: PackageSeed[]
): TravelPackage[] {
  return titles.map((title, index) => {
    const seed = seeds[index % seeds.length]
    return {
      category,
      title,
      ...seed
    }
  })
}

export const localPhilippinesPackages: TravelPackage[] = buildSamplePackages(
  "local",
  localTitles,
  localSeeds
)

export const internationalPackages: TravelPackage[] = buildSamplePackages(
  "international",
  internationalTitles,
  internationalSeeds
)

export const packageCatalog: Record<PackageCategory, TravelPackage[]> = {
  local: localPhilippinesPackages,
  international: internationalPackages
}
