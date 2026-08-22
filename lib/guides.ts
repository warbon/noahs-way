/**
 * Long-form guides — the questions people search before they are anywhere near
 * choosing a package.
 *
 * Content lives in code rather than the admin panel on purpose, for now. These
 * pages carry visa rules and government fees: getting one wrong is a complaint,
 * not a typo, so they should go through review the way code does. Moving them
 * into the admin editor later is a straightforward port of this shape.
 */

export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "checklist"; items: string[] }
  | { type: "note"; tone: "info" | "warning"; title?: string; text: string }
  | { type: "table"; caption?: string; columns: string[]; rows: string[][] }

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
   * Rendered near the top — a guide full of fees and visa rules is worthless
   * without one, and Korea changed its rules twice in 2026.
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
    slug: "before-you-fly-filipino-travellers",
    title: "Before you fly: what Filipino travellers need",
    question: "What do I actually need to prepare before travelling abroad?",
    summary:
      "Passport rules, which destinations need a visa, what happens at the Philippine immigration counter, and the fees that come on top of any tour price.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    relatedPackageSlug: "/packages",
    relatedPackageLabel:
      "Every package we run publishes its full itinerary, inclusions and exclusions — the documents both counters ask to see.",
    sources: [
      {
        label: "How to avoid being offloaded, 2026 — The Poor Traveler",
        url: "https://www.thepoortraveler.net/offloaded-immigration-requirements/"
      },
      {
        label: "Avoiding offloading at Philippine immigration — Moneymax",
        url: "https://www.moneymax.ph/lifestyle/articles/how-to-avoid-offload-flight"
      },
      {
        label: "South Korea visa for Filipinos, 2026 — Klook",
        url: "https://www.klook.com/en-PH/blog/south-korea-visa-for-filipinos/"
      },
      {
        label: "Vietnam visa for Philippine citizens",
        url: "https://www.myvietnamvisa.com/visa-requirements/philippines.html"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Check before you rely on this",
        text: "Rules and fees change — Korea altered its tourist visa requirements twice in 2026. Everything here was checked on the date shown above. The embassy concerned and the Bureau of Immigration are the only authorities on what is required today, and nothing on this page is a guarantee that you will be issued a visa or allowed to depart."
      },
      {
        type: "paragraph",
        text: "Most of the worry around a first trip abroad comes down to four things: whether your passport is in order, whether you need a visa, whether you will actually be allowed to board, and what the trip costs once every fee is counted. Here they are in order."
      },

      { type: "heading", text: "1. Your passport" },
      {
        type: "paragraph",
        text: "Nearly every destination asks the same two things, and they catch people out more often than visas do."
      },
      {
        type: "checklist",
        items: [
          "Valid for at least six months beyond the date you enter the country",
          "At least one blank page for entry and exit stamps",
          "No significant damage — water damage or a loose page can be refused at the counter"
        ]
      },
      {
        type: "paragraph",
        text: "If your passport expires within a year, renew it before booking anything. Waiting on a renewal appointment is the most common reason a trip has to be moved."
      },

      { type: "heading", text: "2. Do you need a visa?" },
      {
        type: "paragraph",
        text: "It depends entirely on where you are going, and the gap is wider than most people expect. Here is where the destinations we currently run trips to stand."
      },
      {
        type: "table",
        caption: "For Philippine passport holders, checked August 2026",
        columns: ["Destination", "Visa needed?", "How long you may stay"],
        rows: [
          ["Vietnam", "No — visa-free", "21 days. Longer stays need an e-visa."],
          [
            "South Korea, mainland",
            "Yes — C-3-9 tourist visa",
            "Up to 90 days. Processing takes up to 10 working days."
          ],
          [
            "South Korea, Jeju only",
            "No, with conditions",
            "30 days, but only on a direct flight into Jeju, with no onward travel to the mainland."
          ]
        ]
      },
      {
        type: "paragraph",
        text: "Korea's process got easier in 2026. From 20 February the requirement for three months of bank statements was dropped for tourist applicants, and proof of student status became more flexible. From 15 June, regular processing moved to up to ten working days, with express at five. Apply at least a month ahead, and earlier for autumn and New Year departures when volumes peak."
      },
      {
        type: "note",
        tone: "info",
        text: "Vietnam being visa-free is why it is often the easiest first trip abroad. If the visa interview is the part putting you off, start there."
      },

      { type: "heading", text: "3. The Philippine immigration counter" },
      {
        type: "paragraph",
        text: "This is the part people underestimate. Being offloaded means Philippine immigration stops you boarding your flight — with a valid ticket and visa in hand. More than 36,000 Filipinos were offloaded in 2023."
      },
      {
        type: "paragraph",
        text: "Officers are checking one thing: that you are travelling for the reason you state, and that you intend to come home. Every question is aimed at that, and everything below is about answering it plainly."
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Arrive at least four hours before departure. If you are sent for secondary inspection, you need the time.",
          "Carry the documents rather than describing them — return ticket, hotel bookings, a day-by-day itinerary, and proof of your ties here such as a certificate of employment or business registration.",
          "Answer honestly and keep it short. Long answers invite follow-up questions, and officers are trained to notice inconsistencies.",
          "Be clear about who is paying. If someone else is funding the trip, bring proof of your relationship to them.",
          "Expect more questions if it is your first time abroad. That is routine, not suspicion of you personally."
        ]
      },
      {
        type: "note",
        tone: "warning",
        title: "Cases that need paperwork weeks in advance",
        text: "A minor travelling without both parents may need a DSWD travel clearance. Anyone travelling to meet or marry a foreign fiancé or spouse needs a CFO certificate. Travelling as a tourist while intending to work is the classic offloading case and needs the correct working visa instead. Sort these out well before the airport."
      },

      { type: "heading", text: "4. What it costs on top of the tour price" },
      {
        type: "paragraph",
        text: "A package price is not the whole number, and any operator implying otherwise is setting you up for a surprise. These are the usual additions."
      },
      {
        type: "list",
        items: [
          "Philippine travel tax — around ₱1,620 per person, usually paid at the airport",
          "Check-in baggage, where only hand-carry is included. Often ₱1,700 or more each way",
          "Tipping for guides and drivers, which on some tours is mandatory and collected up front",
          "Travel insurance, which several destinations require",
          "Visa processing fees, where a visa is needed",
          "Anything marked optional on the itinerary"
        ]
      },
      {
        type: "paragraph",
        text: "Add these before you compare two tours. A cheaper package with a longer exclusions list is often the more expensive trip."
      },
      {
        type: "note",
        tone: "info",
        title: "How to compare fairly",
        text: "Ask any operator for the exclusions in writing before paying a deposit. Every package on this site lists its inclusions and exclusions on the package page, so you can add up the real total yourself."
      },

      { type: "heading", text: "What a tour package does, and does not, cover" },
      {
        type: "paragraph",
        text: "A packaged trip does not get you a visa. The consulate decides that, and no agency can promise approval. What it does is produce the paperwork both counters ask for: confirmed return flights, hotel bookings, and a day-by-day itinerary that agrees with them. Putting those three together consistently is the part most first-time travellers find hardest."
      },
      {
        type: "paragraph",
        text: "Travelling independently is entirely doable — just assemble the same three documents yourself before you go anywhere near the airport."
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
