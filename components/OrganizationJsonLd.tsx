import { siteConfig } from "@/lib/site-config"

/**
 * TravelAgency structured data for the homepage. Feeds the business name,
 * phone, email and social profile into search results and knowledge panels.
 */
export default function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    image: `${siteConfig.url}/images/noahs-way-logo.png`,
    logo: `${siteConfig.url}/images/noahs-way-logo.png`,
    priceRange: "₱₱",
    address: {
      "@type": "PostalAddress",
      addressCountry: siteConfig.address.country,
      ...(siteConfig.address.city ? { addressLocality: siteConfig.address.city } : {}),
      ...(siteConfig.address.region ? { addressRegion: siteConfig.address.region } : {}),
      ...(siteConfig.address.street ? { streetAddress: siteConfig.address.street } : {}),
      ...(siteConfig.address.postalCode ? { postalCode: siteConfig.address.postalCode } : {})
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: siteConfig.phone,
      email: siteConfig.email,
      areaServed: "PH",
      availableLanguage: ["en", "fil"]
    },
    sameAs: [siteConfig.facebookUrl, siteConfig.instagramUrl].filter(Boolean)
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
