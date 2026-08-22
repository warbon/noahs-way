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
  },

  {
    slug: "delayed-or-cancelled-flight-philippines",
    title: "Your flight was delayed or cancelled. Here is what you are owed.",
    question: "What are my rights if my flight is delayed or cancelled?",
    summary:
      "The Air Passenger Bill of Rights sets out what an airline must give you for a delay of three hours or more, and what you can claim when a flight is cancelled without notice.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    sources: [
      {
        label: "Airline passenger rights and flight delay compensation — Respicio & Co.",
        url: "https://www.respicio.ph/commentaries/airline-passenger-rights-flight-delay-compensation"
      },
      {
        label: "Know your air passenger rights — Philippine News Agency",
        url: "https://www.pna.gov.ph/articles/1045093"
      },
      {
        label: "Airline compensation rights, Philippines",
        url: "https://www.respicio.ph/features/airline-compensation-rights-philippines"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "General information, not legal advice",
        text: "This is a plain-language summary of rules that were in force when this page was checked. Airline conditions of carriage vary and the regulations can be amended. For a dispute, deal with the airline in writing first, then the Civil Aeronautics Board — and take proper legal advice if the amount matters."
      },
      {
        type: "paragraph",
        text: "Most Filipino passengers do not know they are owed anything at all when a flight goes wrong, so they accept whatever the counter offers. The Air Passenger Bill of Rights — Joint Administrative Order No. 1, series of 2012 — says otherwise. It covers domestic and international flights departing from Philippine airports."
      },

      { type: "heading", text: "If your flight is delayed three hours or more" },
      {
        type: "paragraph",
        text: "This applies whether or not the delay is the airline's fault. You are entitled to be looked after while you wait."
      },
      {
        type: "checklist",
        items: [
          "Refreshments or a meal, appropriate to the time of day",
          "Free phone calls and email — enough to tell someone where you are",
          "First aid, if you need it",
          "Rebooking at no extra charge onto the next available flight, or another flight within 30 days",
          "Or a refund of the fare, including taxes and surcharges, if you would rather not travel"
        ]
      },
      {
        type: "paragraph",
        text: "Ask at the counter, in those words. These are obligations, not goodwill gestures, and they are frequently not offered unless requested."
      },

      { type: "heading", text: "If your flight is cancelled" },
      {
        type: "paragraph",
        text: "The dividing line is notice. If the airline told you at least 24 hours before departure, it has met its obligation to warn you. Cancel with less notice than that, and you may choose one of the following."
      },
      {
        type: "list",
        items: [
          "A full refund of the fare, including taxes and surcharges",
          "Rebooking onto the next available flight at no additional charge",
          "Rebooking to a later date of your choosing, subject to seat availability"
        ]
      },
      {
        type: "note",
        tone: "info",
        text: "The choice is yours, not the airline's. If you are offered only a voucher or only a rebooking, you can say which of the three you want."
      },

      { type: "heading", text: "When the airline does not have to pay" },
      {
        type: "paragraph",
        text: "There is a real limit, and it is worth knowing so you do not waste effort on a claim that will not succeed. Carriers are not liable for monetary compensation where the disruption was caused by circumstances outside their control."
      },
      {
        type: "list",
        items: [
          "Extreme weather and acts of God",
          "Security threats",
          "Air traffic control directives or congestion",
          "Strikes by third parties, such as airport or ground handling staff"
        ]
      },
      {
        type: "paragraph",
        text: "Note the distinction: even in these cases the duty of care during a long delay — food, communication, first aid — is a separate matter from monetary compensation."
      },

      { type: "heading", text: "What to do at the time" },
      {
        type: "list",
        ordered: true,
        items: [
          "Photograph the departure board showing the delay or cancellation, and keep your boarding pass.",
          "Ask staff for the reason in writing, or note the name of who told you and when.",
          "Keep receipts for anything you have to pay for yourself — meals, a hotel, transport.",
          "Make your request at the counter before you leave the airport, and say which remedy you are choosing.",
          "If it is not resolved, write to the airline, then escalate to the Civil Aeronautics Board."
        ]
      },
      {
        type: "paragraph",
        text: "None of this requires a lawyer or a claims service. Most of it is a matter of asking clearly and keeping a record."
      }
    ]
  },

  {
    slug: "philippine-travel-tax-exemptions-refunds",
    title: "Travel tax: who pays less, who pays nothing, and how to claim it back",
    question: "Do I have to pay the full Philippine travel tax?",
    summary:
      "The travel tax is not the same for everyone. Children pay half, some passengers are exempt entirely, and if you have already overpaid you can apply for a refund.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    sources: [
      { label: "Travel tax — TIEZA", url: "https://tieza.gov.ph/travel-tax/" },
      { label: "Reduced travel tax — TIEZA", url: "https://tieza.gov.ph/reduced-travel-tax/" },
      { label: "Travel tax refund — TIEZA", url: "https://tieza.gov.ph/travel-tax-refund/" },
      {
        label: "How to pay, and apply for exemption or refund — The Poor Traveler",
        url: "https://www.thepoortraveler.net/travel-tax/"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Rates and categories change",
        text: "TIEZA administers the travel tax and is the only authority on current rates, exemptions and refunds. The figures here were checked on the date above — confirm with TIEZA before relying on them, especially if you are claiming a reduced rate or a refund."
      },
      {
        type: "paragraph",
        text: "The Philippine travel tax is charged on passengers departing the country, commonly ₱1,620 in economy, and it is often bundled invisibly into a fare. Most people pay the full amount without checking whether they had to — and a good number of them did not."
      },

      { type: "heading", text: "Children pay half, and it is easy to miss" },
      {
        type: "paragraph",
        text: "A child aged between 2 and 11 on the date of travel, holding a Philippine passport, pays a reduced rate of ₱810 rather than the full amount. No supporting documents are needed."
      },
      {
        type: "note",
        tone: "info",
        text: "The catch is that it is not applied automatically. The child's date of birth has to be entered correctly at booking. Families travelling with young children routinely overpay because of a mistyped birth date."
      },
      {
        type: "paragraph",
        text: "Infants aged two and under are exempt entirely."
      },

      { type: "heading", text: "Who is exempt" },
      {
        type: "paragraph",
        text: "TIEZA lists around nineteen categories of exempt passenger. The ones that come up most often are these."
      },
      {
        type: "list",
        items: [
          "Overseas Filipino workers, subject to TIEZA's conditions",
          "Filipinos who are permanent residents abroad and meet the stay requirements",
          "Infants aged two and under",
          "International flight crew on duty",
          "Diplomats and Philippine officials travelling on official business",
          "Foreign passport holders on a non-immigrant stay of under a year, on presenting their passport ID pages and last arrival stamp"
        ]
      },

      { type: "heading", text: "If you already paid too much" },
      {
        type: "paragraph",
        text: "An overpayment can be reclaimed. If you paid the full rate but qualified for the reduced rate or an exemption, you can apply for a refund of the difference at any TIEZA travel tax office or airport counter."
      },
      {
        type: "table",
        caption: "Refund basics, checked August 2026",
        columns: ["What to expect", "Detail"],
        rows: [
          ["Where to apply", "Any TIEZA travel tax office, or an airport counter"],
          ["Processing time", "Roughly 30 to 90 days"],
          ["Processing fee", "₱200"]
        ]
      },
      {
        type: "paragraph",
        text: "Keep the ticket, the receipt and proof of the category you are claiming under. A refund on a child's fare is usually worth more than the processing fee; on a single adult economy ticket, check the arithmetic before you commit to the paperwork."
      },

      { type: "heading", text: "A word on how it appears on a tour price" },
      {
        type: "paragraph",
        text: "Travel tax is a government charge, not part of what a tour operator sells, which is why it appears as an exclusion on most package listings — including ours. That is normal and correct. What is not normal is failing to mention it at all, so that it arrives as a surprise at the airport."
      },
      {
        type: "paragraph",
        text: "Whoever you book with, ask what the travel tax treatment is before you pay a deposit, and whether children in your group have been declared at the right age."
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
