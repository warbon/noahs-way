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

/**
 * Registrations and memberships, in the order a customer checks them.
 *
 * Philippine buyers are advised to verify a travel agency's DOT accreditation
 * and business registration before paying, so these are trust signals rather
 * than legal boilerplate — they belong in the footer, not on a buried page.
 *
 * A blank `value` renders as a visible "to be added" placeholder instead of
 * being hidden, so an unfinished entry is obvious to the owner rather than
 * silently missing. Set the matching env var to publish the real number.
 */
export type Accreditation = {
  label: string
  value: string
  /** Shown under the number — what this registration actually certifies. */
  note: string
}

export const accreditations: Accreditation[] = [
  {
    label: "DTI Registration",
    value: env("NEXT_PUBLIC_DTI_REGISTRATION", ""),
    note: "Registered business name with the Department of Trade and Industry."
  },
  {
    label: "DOT Accreditation",
    value: env("NEXT_PUBLIC_DOT_ACCREDITATION", ""),
    note: "Department of Tourism accreditation for travel and tour operators."
  },
  {
    label: "PTAA Membership",
    value: env("NEXT_PUBLIC_PTAA_MEMBERSHIP", ""),
    note: "Philippine Travel Agencies Association member."
  }
]

/**
 * How customers can pay. Instalment options matter here: GCash's GGives covers
 * up to ₱125,000 spread over 24 months, which is the whole price range of the
 * catalog — so it is a conversion lever, not a footnote.
 */
export const paymentMethods = [
  { name: "GCash", detail: "Send to our registered GCash business account." },
  { name: "GGives instalment", detail: "Split the cost over up to 24 months, subject to your GCash limit." },
  { name: "Maya", detail: "Direct transfer to our Maya account." },
  { name: "Bank transfer", detail: "Over-the-counter or online, to our company bank account." },
  { name: "Over-the-counter", detail: "Bayad Center and partner outlets." }
] as const

/** True when at least one registration number has actually been filled in. */
export const hasPublishedAccreditation = accreditations.some((item) => item.value.trim() !== "")

/** `tel:` needs the number stripped of spaces and punctuation. */
export const phoneHref = `tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`
export const emailHref = `mailto:${siteConfig.email}`
/** The page handle resolves on m.me just like the numeric page id, and reads better. */
export const messengerHref = `https://m.me/${siteConfig.facebookHandle}`
