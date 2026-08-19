/**
 * Single source of truth for business identity and contact details.
 *
 * Consumed by the footer, header CTAs, metadata/Open Graph, JSON-LD, sitemap
 * and the inquiry fallback message. These are public business details, so the
 * real values live here as defaults; the NEXT_PUBLIC_* vars stay available for
 * per-environment overrides (e.g. a staging phone number).
 */

function env(key: string, fallback: string) {
  const value = process.env[key]?.trim()
  return value || fallback
}

const facebookHandle = env("NEXT_PUBLIC_FACEBOOK_HANDLE", "noahswaytravel")

export const siteConfig = {
  name: "Noah's Way Travel & Tours",
  shortName: "Noah's Way",
  tagline: "Forget the Map — Travel Beyond Boundaries",
  description:
    "Curated local and international travel packages from the Philippines, with premium stays, private guides, and seamless transfers.",

  url: env("NEXT_PUBLIC_SITE_URL", "http://localhost:3100"),

  phone: env("NEXT_PUBLIC_CONTACT_PHONE", "+63 917 192 1136"),
  email: env("NEXT_PUBLIC_CONTACT_EMAIL", "sales.noahsway@gmail.com"),

  facebookHandle,
  facebookUrl: env("NEXT_PUBLIC_FACEBOOK_URL", `https://www.facebook.com/${facebookHandle}/`),
  instagramUrl: env("NEXT_PUBLIC_INSTAGRAM_URL", ""),

  address: {
    street: env("NEXT_PUBLIC_ADDRESS_STREET", ""),
    city: env("NEXT_PUBLIC_ADDRESS_CITY", "Philippines"),
    region: env("NEXT_PUBLIC_ADDRESS_REGION", ""),
    postalCode: env("NEXT_PUBLIC_ADDRESS_POSTAL", ""),
    country: "PH"
  },

  hours: "Mon–Sat, 9:00 AM – 6:00 PM (PHT)"
} as const

/** `tel:` needs the number stripped of spaces and punctuation. */
export const phoneHref = `tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`
export const emailHref = `mailto:${siteConfig.email}`
/** The page handle resolves on m.me just like the numeric page id, and reads better. */
export const messengerHref = `https://m.me/${siteConfig.facebookHandle}`
