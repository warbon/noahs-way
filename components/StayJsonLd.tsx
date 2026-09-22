import { siteConfig } from "@/lib/site-config"
import type { StayRecord } from "@/lib/stay-repository-types"
import { buildStayHref } from "@/lib/stay-slug"
import { deriveSlug } from "@/lib/slug"

/**
 * `Apartment` structured data for a single unit, separate from the homepage's
 * `TravelAgency` block.
 *
 * Kept distinct on purpose: the agency is the business, the unit is a specific
 * property with a capacity, a floor area and a nightly price. Folding condo
 * listings into the agency's own markup would describe the company as if it
 * were the accommodation.
 */
export default function StayJsonLd({ stay }: { stay: StayRecord }) {
  const url = `${siteConfig.url}${buildStayHref(deriveSlug(stay, "stay"))}`
  const image = stay.previewImage.startsWith("http")
    ? stay.previewImage
    : `${siteConfig.url}${stay.previewImage}`

  const data = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: stay.title,
    description: stay.summary ?? stay.details,
    url,
    image,
    numberOfBedrooms: stay.bedrooms,
    ...(stay.baths ? { numberOfBathroomsTotal: stay.baths } : {}),
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: stay.maxGuests,
      unitCode: "C62"
    },
    ...(stay.floorArea
      ? {
          floorSize: {
            "@type": "QuantitativeValue",
            value: stay.floorArea,
            unitCode: "MTK"
          }
        }
      : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: stay.city,
      addressCountry: "PH"
    },
    ...(stay.amenities?.length
      ? {
          amenityFeature: stay.amenities.map((amenity) => ({
            "@type": "LocationFeatureSpecification",
            name: amenity,
            value: true
          }))
        }
      : {}),
    /*
      Priced per night rather than as a flat `price`. A bare number here would
      be read as the cost of the whole stay, which is the one number this page
      never states — the guest picks the length.
    */
    potentialAction: {
      "@type": "ReserveAction",
      target: url
    },
    offers: {
      "@type": "Offer",
      price: stay.nightlyRate,
      priceCurrency: stay.currency ?? "PHP",
      availability: "https://schema.org/InStock",
      url,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: stay.nightlyRate,
        priceCurrency: stay.currency ?? "PHP",
        unitCode: "DAY",
        unitText: "night"
      }
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
