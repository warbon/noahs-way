/**
 * Long-form guides — the visa, immigration and cost questions people search for
 * before they are anywhere near choosing a package.
 *
 * Content lives in code rather than the admin panel on purpose, for now. These
 * pages carry visa rules and fees: getting one wrong is a complaint, not a
 * typo, so they should go through review the way code does. Moving them into
 * the admin editor later is a straightforward port of this shape.
 */

export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "checklist"; items: string[] }
  | { type: "note"; tone: "info" | "warning"; title?: string; text: string }

export type GuideStatus = "published" | "draft"

export type Guide = {
  slug: string
  title: string
  /** Shown on the index and used as the meta description. */
  summary: string
  /**
   * The question a reader would actually type. Kept explicit so the page can
   * be written to answer it rather than to rank for it.
   */
  question: string
  status: GuideStatus
  /**
   * The date the facts in this guide were last checked against a source.
   * Rendered on the page — a visa guide without one is worthless, and Korea's
   * rules changed twice in 2026.
   */
  factsCheckedOn: string
  /** Optional: the package this guide should send a convinced reader to. */
  relatedPackageSlug?: string
  relatedPackageLabel?: string
  sources: { label: string; url: string }[]
  body: GuideBlock[]
}

export const guides: Guide[] = [
  {
    slug: "korean-visa-for-filipinos",
    title: "The Korean visa for Filipino travellers",
    question: "Do I need a visa for South Korea, and what do I have to submit?",
    summary:
      "What the C-3-9 tourist visa requires in 2026, what changed in February and June, the two visa-free exceptions, and which parts a tour operator can handle for you.",
    status: "draft",
    factsCheckedOn: "2026-08-22",
    relatedPackageSlug: "/packages/international/nami-island-seoul-tour",
    relatedPackageLabel:
      "Nami Island & Seoul Tour — group visa processing arranged, with the itinerary and bookings your application needs.",
    sources: [
      {
        label: "South Korea visa for Filipinos, 2026 — Klook",
        url: "https://www.klook.com/en-PH/blog/south-korea-visa-for-filipinos/"
      },
      {
        label: "Korean tourist visa from the Philippines — Oona",
        url: "https://myoona.ph/blog/travel/korean-tourist-visa-philippines-guide/"
      },
      {
        label: "Korean visa application guide — The Poor Traveler",
        url: "https://www.thepoortraveler.net/south-korea-visa/"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Check before you rely on this",
        text: "Korea changed its tourist visa rules twice in 2026. Everything here was checked on the date shown above, but the Korean Embassy and the Korea Visa Application Center are the only authorities on what is required today. Nothing on this page is a guarantee of approval — the consulate decides, not us."
      },
      {
        type: "paragraph",
        text: "Yes, Filipino passport holders need a visa for mainland South Korea. The one you want for a holiday is the C-3-9 short-term tourist visa, which covers sightseeing and leisure for stays of up to 90 days."
      },
      {
        type: "paragraph",
        text: "That is the short answer. The longer answer is that the process got noticeably easier in 2026, and that a packaged tour removes most of the parts people find stressful."
      },

      { type: "heading", text: "What changed in 2026" },
      {
        type: "list",
        items: [
          "From 20 February 2026, the Korea Visa Application Center in the Philippines stopped requiring three months of bank statements from tourist applicants. This was the single most common reason people delayed applying.",
          "Proof of student status became more flexible — either a school certificate or a student ID is accepted.",
          "From 15 June 2026, regular processing for a short-term C-3 visa takes up to 10 working days. Express applications are 5 working days."
        ]
      },
      {
        type: "paragraph",
        text: "Ten working days is roughly two calendar weeks before you count weekends and holidays. Plan your application at least a month before departure, and longer if you are travelling in autumn or over the New Year, when volumes are highest."
      },

      { type: "heading", text: "Where you can apply" },
      {
        type: "list",
        items: [
          "The Korea Visa Application Center (KVAC) in Manila, either as a walk-in or with a booked appointment.",
          "The Korean Consulate for applicants in Cebu, through an online appointment.",
          "Through a travel agency designated by the Korean Embassy, which files on your behalf. Designation is granted to specific agencies by the embassy — ask any agency directly whether they hold it."
        ]
      },

      { type: "heading", text: "The two visa-free exceptions" },
      {
        type: "paragraph",
        text: "There are two narrow routes into Korea that do not need a visa, and both come with real limits worth understanding before you plan around them."
      },
      {
        type: "list",
        items: [
          "Jeju Island — visa-free for up to 30 days, but only if you arrive on a direct international flight into Jeju International Airport. You cannot travel on to the mainland.",
          "The Jeolla region — visa-free if you join a group tour run by a government-designated travel agency and enter through Muan International Airport. Travel is limited to North Jeolla, South Jeolla, Gwangju and Jeju. Only designated agencies can run these, so check with the operator before planning around it."
        ]
      },
      {
        type: "note",
        tone: "info",
        text: "Neither route gets you to Seoul. If your trip includes Seoul, Nami Island, Mt. Seorak or Everland, you need the C-3-9 visa."
      },

      { type: "heading", text: "What to prepare" },
      {
        type: "paragraph",
        text: "Requirements vary by employment status and change from time to time, so treat this as a starting checklist and confirm the current list with KVAC before you file."
      },
      {
        type: "checklist",
        items: [
          "Passport valid for at least six months, with blank pages",
          "Completed application form and a recent photo to specification",
          "Proof of employment, business registration, or school enrolment",
          "Proof of your ability to fund the trip",
          "Confirmed return flights and hotel bookings",
          "A day-by-day itinerary for the whole stay"
        ]
      },

      { type: "heading", text: "Where a tour package helps" },
      {
        type: "paragraph",
        text: "We are not a Korean Embassy designated agency, so we do not file your visa for you. What a packaged trip does give you is the paperwork the application rests on."
      },
      {
        type: "paragraph",
        text: "Three of the items above — the confirmed return flights, the hotel bookings, and the day-by-day itinerary — are documents we produce as a matter of course. On a packaged trip they arrive together and already agree with each other, which is what a consular officer is checking for. Assembling those three yourself, consistently, is the part most first-time applicants find hardest."
      },
      {
        type: "paragraph",
        text: "Our Korea departures also run with a partner operator who arranges group visa processing for the whole group. That means your application is submitted alongside everyone else's on the same departure, with the same supporting documents. It does not mean approval is guaranteed — the consulate decides every application on its own merits, and no agency can promise otherwise."
      },
      {
        type: "paragraph",
        text: "The same three documents are what Philippine immigration asks to see on the day you fly."
      },

      {
        type: "note",
        tone: "info",
        title: "Still to confirm before this page is published",
        text: "This guide is a draft. One thing is still open: exactly what the group visa arrangement on the Nami Island package covers — who submits, what the traveller supplies, and what happens to the package price if an application is refused. The wording here is deliberately cautious until that is confirmed."
      }
    ]
  }
]

export function publishedGuides() {
  return guides.filter((guide) => guide.status === "published")
}

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug) ?? null
}
