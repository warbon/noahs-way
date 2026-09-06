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

const facebookHandle = env("NEXT_PUBLIC_FACEBOOK_HANDLE", "noahswaytravelandtours")

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
  facebookUrl: env("NEXT_PUBLIC_FACEBOOK_URL", `https://www.facebook.com/${facebookHandle}`),
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
 * An issuing body's mark, with the file's true pixel dimensions.
 *
 * The dimensions are load-bearing rather than documentation: the badge renders
 * height-constrained with `width: auto`, so the browser reserves horizontal
 * space from this ratio before the file decodes. Wrong numbers mean the badge
 * visibly jumps width on load, and skew the srcset Next generates.
 */
export type AccreditationMark = {
  src: string
  width: number
  height: number
}

/**
 * Registrations and memberships, in the order a customer checks them.
 *
 * Philippine buyers are advised to verify a travel agency's DOT accreditation
 * and business registration before paying, so these are trust signals rather
 * than legal boilerplate — they belong in the footer, not on a buried page.
 *
 * A blank `value` renders as a visible "to be added" placeholder instead of
 * being hidden, so an unfinished entry is obvious to the owner rather than
 * silently missing.
 *
 * Note that DTI and BIR carry their real numbers as defaults below, following
 * this file's convention for public business details — they publish whether or
 * not an env var is set. Only DOT and PTAA are still waiting on one. Anyone
 * deploying this site for a different business has to override or clear those
 * two defaults; leaving the env vars unset is not enough.
 */
export type Accreditation = {
  label: string
  value: string
  /** Shown under the number — what this registration actually certifies. */
  note: string
  /**
   * The issuing body's mark. Optional — an entry without one renders text-only,
   * which reads fine because the number beside it is what a customer verifies.
   *
   * These are plain agency emblems: no RSN, no QR, no year, so they identify
   * the issuing body rather than this business. That is what makes them safe to
   * reuse between projects, and it also means the emblem alone proves nothing —
   * the number does the work. Never substitute a per-business badge issued to
   * someone else; it would resolve to the wrong registration.
   *
   * A mark is only shown once `value` is filled in. Rendering an official
   * emblem above a "to be added" placeholder would assert a credential the
   * business does not hold, so `AccreditationLogo` drops it instead.
   */
  logo?: AccreditationMark
}

/** True once a registration's number has actually been filled in. */
export function isPublished(item: Accreditation) {
  return item.value.trim() !== ""
}

export const accreditations: Accreditation[] = [
  {
    label: "DTI Registration",
    value: env("NEXT_PUBLIC_DTI_REGISTRATION", "Business Name No. 7004987"),
    note:
      "Business name registered with the Department of Trade and Industry — Region VII " +
      "(Central Visayas), valid to 13 March 2030.",
    logo: { src: "/images/badges/dti.png", width: 214, height: 215 }
  },
  {
    /**
     * The RSN from the "BIR Registered" seal, not the TIN. The seal is the
     * number the Bureau publishes for customers to check a business against,
     * so it is the one that belongs on a public page.
     */
    label: "BIR Registration",
    value: env("NEXT_PUBLIC_BIR_REGISTRATION", "RSN 080RC20250000004120"),
    note: "Registered with the Bureau of Internal Revenue; we issue official receipts.",
    logo: { src: "/images/badges/bir-registered.png", width: 177, height: 145 }
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
export type PaymentMethod = {
  name: string
  detail: string
  /** Which generic icon stands in until a real brand mark is supplied. */
  icon: "wallet" | "instalment" | "bank" | "counter"
  /**
   * Path to the provider's official logo, e.g. "/images/payments/gcash.svg".
   *
   * Left unset on purpose. GCash, Maya and Bayad Center marks are third-party
   * trademarks, usually licensed to registered merchants under brand
   * guidelines — they have to come from the provider's own brand kit rather
   * than be copied off the web or redrawn. Drop the file in and set the path;
   * the icon below is only the stand-in.
   */
  logo?: string
}

export const paymentMethods: PaymentMethod[] = [
  { name: "GCash", detail: "Send to our registered GCash business account.", icon: "wallet" },
  {
    name: "GGives instalment",
    detail: "Split the cost over up to 24 months, subject to your GCash limit.",
    icon: "instalment"
  },
  { name: "Maya", detail: "Direct transfer to our Maya account.", icon: "wallet" },
  {
    name: "Bank transfer",
    detail: "Over-the-counter or online, to our company bank account.",
    icon: "bank"
  },
  { name: "Over-the-counter", detail: "Bayad Center and partner outlets.", icon: "counter" }
]

/** True when at least one registration number has actually been filled in. */
export const hasPublishedAccreditation = accreditations.some(isPublished)

/** `tel:` needs the number stripped of spaces and punctuation. */
export const phoneHref = `tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`
export const emailHref = `mailto:${siteConfig.email}`
/** The page handle resolves on m.me just like the numeric page id, and reads better. */
export const messengerHref = `https://m.me/${siteConfig.facebookHandle}`
