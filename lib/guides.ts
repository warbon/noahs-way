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
  },

  {
    slug: "philippine-passport-renewal",
    title: "Renewing your Philippine passport without the panic",
    question: "How do I renew my passport, and how long will it take?",
    summary:
      "Appointments are free and mandatory, renewal costs ₱950 or ₱1,200 expedited, and processing runs 15–20 working days. Here is the sequence, and the peak months to avoid.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    sources: [
      {
        label: "Philippine passport renewal 2026 — Traveloka",
        url: "https://www.traveloka.com/en-ph/explore/tips/ultimate-guide-renewing-philippine-passport/63530"
      },
      {
        label: "DFA passport appointment application — Respicio & Co.",
        url: "https://www.respicio.ph/commentaries/dfa-passport-appointment-application-in-the-philippines"
      },
      {
        label: "Passport application and renewal requirements — Globe",
        url: "https://www.globe.com.ph/blog/ph-passport-application-and-renewal-requirements"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Booking an appointment is free",
        text: "The DFA does not charge for an appointment slot. Any site or fixer asking for a booking fee is not the DFA. Fees are paid only for the passport itself, at an authorised payment centre, after your slot is confirmed."
      },
      {
        type: "paragraph",
        text: "A passport that expires within a year is the most common reason a trip has to be postponed. Renewal is not difficult, but it is slow and appointment-bound, so the order you do things in matters."
      },

      { type: "heading", text: "The sequence" },
      {
        type: "list",
        ordered: true,
        items: [
          "Book an appointment online. Walk-ins are generally not accepted — the DFA runs an appointment-based system.",
          "Pay the passport fee at an authorised payment centre once your slot is confirmed.",
          "Appear in person on the date and time given. Nobody can go in your place.",
          "Bring originals and photocopies of everything, in a folder.",
          "Collect the passport, or have it delivered, once processing is done."
        ]
      },

      { type: "heading", text: "What it costs and how long it takes" },
      {
        type: "table",
        caption: "Checked August 2026 — confirm current rates with the DFA",
        columns: ["Processing", "Fee", "Typical time"],
        rows: [
          ["Regular", "₱950", "15–20 working days"],
          ["Expedited", "₱1,200", "7–10 working days"]
        ]
      },
      {
        type: "paragraph",
        text: "Working days, not calendar days — count weekends and holidays on top. Expedited buys you roughly a week, not same-day service."
      },

      { type: "heading", text: "The months to avoid" },
      {
        type: "paragraph",
        text: "Appointment availability and processing both stretch during peak periods: March to June, and November to December. If you are travelling in those windows, renew months ahead rather than weeks."
      },

      { type: "heading", text: "What to bring" },
      {
        type: "paragraph",
        text: "A straightforward renewal with no change of details is light on paperwork — your current passport and the confirmed appointment packet. If anything on your passport is changing, a married name most commonly, expect to bring supporting civil registry documents. Check the current list on the DFA site before you go, because a missing document means a new appointment."
      },
      {
        type: "note",
        tone: "info",
        text: "Renew before you book flights, not after. A confirmed booking does not move an appointment date, and airlines will not refund a trip you cannot take because your passport was not ready."
      }
    ]
  },

  {
    slug: "travel-insurance-explained",
    title: "Travel insurance, in plain terms",
    question: "Do I really need travel insurance, and what does it actually cover?",
    summary:
      "What a policy covers, where it is compulsory rather than optional, why Schengen plans often exclude trip cancellation, and how to read a policy before you buy it.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    sources: [
      {
        label: "Travel insurance Philippines — Oona",
        url: "https://myoona.ph/all-product/travel-insurance/"
      },
      {
        label: "Schengen visa travel insurance guide — UnitedHealthcare",
        url: "https://www.uhcsafetrip.com/tips/schengen-visa-travel-and-insurance-guide/"
      },
      {
        label: "Accredited travel insurance for a Schengen visa — The Poor Traveler",
        url: "https://www.thepoortraveler.net/travel-insurance-schengen-visa/"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Read the policy, not the summary",
        text: "This page explains the general shape of travel insurance. Every policy differs in its limits, exclusions and claim conditions, and only the policy document governs what you are actually covered for. Nothing here is insurance advice or a recommendation of a particular insurer."
      },
      {
        type: "paragraph",
        text: "Travel insurance is bought either because a destination demands it or because a medical bill abroad can be ruinous. Both are good reasons. What trips people up is assuming one policy does everything."
      },

      { type: "heading", text: "What a policy typically covers" },
      {
        type: "checklist",
        items: [
          "Emergency medical treatment and hospitalisation abroad",
          "Emergency evacuation and repatriation",
          "Trip cancellation or interruption, reimbursing prepaid costs you cannot recover",
          "Travel delay, and baggage that is delayed, lost or damaged",
          "Round-the-clock assistance for emergencies and lost documents"
        ]
      },
      {
        type: "paragraph",
        text: "The medical portion is the part you cannot sensibly travel without. Everything else is a judgement about how much prepaid money is at risk."
      },

      { type: "heading", text: "Where it is compulsory" },
      {
        type: "paragraph",
        text: "Some destinations require proof of cover as a visa condition. The Schengen area is the strictest commonly encountered example: a policy must provide at least €30,000 of medical cover, and the application will not proceed without it."
      },
      {
        type: "note",
        tone: "info",
        title: "The trap in Schengen policies",
        text: "Most Schengen-compliant plans are medical-only, because that is all the visa rules require. They frequently do not include trip cancellation. If you want your prepaid flights and hotels protected too, that is usually a separate add-on rather than something already in the policy."
      },
      {
        type: "paragraph",
        text: "Many insurers will refund a Schengen policy in full if the visa is refused, provided cover has not yet started and you can produce the rejection letter. Ask about that before you buy, not after."
      },

      { type: "heading", text: "Questions worth asking before you pay" },
      {
        type: "list",
        items: [
          "What is the medical limit, and does it meet the destination's requirement?",
          "Are pre-existing conditions covered, excluded, or covered only if declared?",
          "Is trip cancellation included, or an add-on?",
          "What is excluded — adventure activities, alcohol, undeclared conditions?",
          "How do you claim, and what do you need to keep? Receipts and reports usually have to be originals.",
          "Is there a 24-hour assistance number that works from abroad?"
        ]
      },

      { type: "heading", text: "If a tour already includes it" },
      {
        type: "paragraph",
        text: "Some packages include a basic policy and some list insurance as an exclusion, meaning it is mandatory but you arrange it yourself. Both are common. Check which applies before you assume you are covered — and if it is included, ask for the limits, because an included policy is not automatically enough for the destination you are visiting."
      }
    ]
  },

  {
    slug: "first-time-flying-abroad-airport-guide",
    title: "Your first flight abroad, gate by gate",
    question: "What actually happens at the airport when I fly out?",
    summary:
      "The order of events at a Philippine airport on departure day — eTravel registration, check-in, travel tax, immigration, security — and roughly how long each takes.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    sources: [
      { label: "eTravel Pass — official registration site", url: "https://etravelpass.ph/" },
      {
        label: "eTravel registration is mandatory and free — Air Traveler Club",
        url: "https://www.airtraveler.club/intel/e-travel-registration-philippines-mandatory-free/"
      },
      {
        label: "How to avoid being offloaded, 2026 — The Poor Traveler",
        url: "https://www.thepoortraveler.net/offloaded-immigration-requirements/"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "eTravel is free. Sites that charge for it are not official.",
        text: "eTravel registration is mandatory for travellers entering and departing the Philippines, and it costs nothing at the government site. Any page charging a fee to register you is not the government. Departing Filipino citizens complete a departure form, which is separate from the arrival one."
      },
      {
        type: "paragraph",
        text: "Nobody explains the airport the first time. Here is the whole sequence, in order, so none of it is a surprise."
      },

      { type: "heading", text: "Before you leave home" },
      {
        type: "list",
        ordered: true,
        items: [
          "Register for eTravel. The window is within 72 hours of your flight — the system will not accept it earlier, and 24 to 48 hours ahead is comfortable. Save the QR code to your phone and screenshot it in case there is no signal.",
          "Check in online if the airline allows it, and note your baggage allowance.",
          "Put your documents in one folder: passport, printed booking, hotel confirmations, itinerary, and proof of employment or business.",
          "Leave for the airport in time to arrive at least four hours before an international departure."
        ]
      },

      { type: "heading", text: "At the airport, in order" },
      {
        type: "list",
        ordered: true,
        items: [
          "Terminal entry — passport and flight details checked at the door.",
          "Check-in — bags weighed and tagged, boarding pass issued. Excess baggage is paid here and is expensive at the counter.",
          "Travel tax, if it was not already included in your ticket. Children and certain passengers pay less or nothing.",
          "Immigration — the counter that decides whether you fly. Have the folder ready and answer briefly and honestly.",
          "Security screening — laptops and liquids out, belts and metal off.",
          "Your gate. Find it, then eat, and be back before boarding time."
        ]
      },
      {
        type: "note",
        tone: "info",
        text: "Four hours sounds excessive until an unusually long queue at one of those six steps. If you are sent for secondary inspection at immigration, the time is what saves the trip."
      },

      { type: "heading", text: "At the other end" },
      {
        type: "list",
        ordered: true,
        items: [
          "Arrival immigration — your visa, if you need one, and often proof of onward travel and where you are staying.",
          "Baggage claim, then customs.",
          "Money and a connection — an ATM or a currency counter, and a local SIM or roaming, before you leave the terminal.",
          "Meet your transfer or find the official taxi rank. Ignore anyone approaching you inside the terminal offering a ride."
        ]
      },

      { type: "heading", text: "Small things that make a difference" },
      {
        type: "list",
        items: [
          "Photograph your passport and keep a copy separately from the original.",
          "Carry a day of medication and one change of clothes in hand luggage, in case a bag is delayed.",
          "Keep some pesos for the trip home from the airport when you return.",
          "Tell your bank you are travelling so a card is not blocked mid-trip.",
          "Write down the address of your first night's accommodation on paper. Arrival immigration will ask, and your phone may be dead."
        ]
      }
    ]
  },

  {
    slug: "philippine-island-fees",
    title: "The fees nobody mentions when you fly to a Philippine island",
    question: "What do I have to pay on arrival at Boracay, El Nido or Coron?",
    summary:
      "Environmental and terminal fees are collected on the island, usually in cash, and are not in your airfare. Here is what the main destinations charge and who is exempt.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    relatedPackageSlug: "/philippines",
    relatedPackageLabel: "Planning a domestic trip? Start with when to go where.",
    sources: [
      {
        label: "Updated Boracay travel requirements — Respicio & Co.",
        url: "https://www.respicio.ph/commentaries/updated-boracay-travel-requirements-and-entry-regulations-for-tourists"
      },
      {
        label: "Boracay environmental and tourist fee requirements",
        url: "https://4stogo.com/blog/posts/environmental-and-tourist-fee-requirements"
      },
      {
        label: "Tourism fees in Boracay under review — Philippine News Agency",
        url: "https://www.pna.gov.ph/articles/1244647"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Rates are set locally and change",
        text: "These fees are collected by local government units, not the airline, and each can change them independently. The figures below were checked on the date above — confirm with your resort or the LGU before you travel, and carry a little more than you expect to need."
      },
      {
        type: "paragraph",
        text: "A domestic flight is cheap enough that people budget the airfare and stop there. Then they land, and there is a counter between them and the boat. These fees are legitimate and they fund the places you came to see, but nobody puts them in the fare, and they are almost always cash."
      },

      { type: "heading", text: "What the main destinations charge" },
      {
        type: "table",
        caption: "Per person, checked August 2026",
        columns: ["Destination", "Fee", "How it works"],
        rows: [
          [
            "Boracay",
            "₱300 environmental + ₱150 terminal",
            "The environmental fee is once for the whole stay, paid on arrival. The terminal fee is charged both entering and leaving."
          ],
          [
            "El Nido",
            "₱400 eco-tourism development fee",
            "Valid for 10 days, so one payment covers a normal trip."
          ],
          ["Coron", "Around ₱200", "Collected on arrival."]
        ]
      },
      {
        type: "paragraph",
        text: "Individually these are small. Across a multi-island itinerary, with a terminal fee at each end of each hop, they add up to real money for a family — and they arrive at exactly the moment you have already committed."
      },

      { type: "heading", text: "Who pays less" },
      {
        type: "list",
        items: [
          "Children aged five and under are generally exempt from the environmental and terminal fees, on proof of age. Bring the birth certificate or a copy.",
          "Some LGUs set reduced rates for residents of the province. If you are going home rather than going on holiday, ask.",
          "Senior and PWD discounts apply to many attraction and boat fees, though not always to the LGU fees themselves. Carry the ID and ask each time."
        ]
      },

      { type: "heading", text: "Practical notes" },
      {
        type: "checklist",
        items: [
          "Bring cash in small notes. Card acceptance at these counters is unreliable at best.",
          "Boracay now runs a digital pass at boracayipass.ph — paying ahead saves queueing on arrival.",
          "Keep the receipts. The terminal fee on the way out is sometimes checked against the one you paid coming in.",
          "Budget separately for island-hopping tours, which carry their own permits and are not covered by the entry fee."
        ]
      },
      {
        type: "note",
        tone: "info",
        title: "Why we publish this",
        text: "We list every fee that sits outside a package price on the package page itself, including this kind. A trip that looks cheaper because the fees were left out is not cheaper — you simply find out later."
      }
    ]
  },

  {
    slug: "when-to-go-where-philippines",
    title: "When to go where in the Philippines",
    question: "When is the best time to travel around the Philippines?",
    summary:
      "Amihan and habagat explained, when typhoon season actually bites, and why writing off July to October across the whole country is the most common planning mistake.",
    status: "published",
    factsCheckedOn: "2026-08-22",
    relatedPackageSlug: "/philippines",
    relatedPackageLabel: "See what a domestic trip involves, and tell us where you want to go.",
    sources: [
      {
        label: "Best time to visit the Philippines — month by month",
        url: "https://www.philippinestourism.org/best-time-to-visit-philippines/"
      },
      {
        label: "Best time to go to the Philippines — Responsible Travel",
        url: "https://www.responsibletravel.com/holidays/philippines/travel-guide/best-time-to-go"
      },
      {
        label: "Typhoon season guide",
        url: "https://www.homejourney.sg/blog/best-time-to-visit-philippines-typhoon-season-guide-homejourney-202601161404"
      }
    ],
    body: [
      {
        type: "note",
        tone: "warning",
        title: "Weather is a pattern, not a promise",
        text: "Everything here describes what is typical. Any given week can behave differently, and PAGASA is the authority on actual forecasts and warnings. Check it before you travel, and take storm advisories seriously regardless of what the season is supposed to be doing."
      },
      {
        type: "paragraph",
        text: "The country has two monsoons, and most trip planning goes wrong by treating the whole archipelago as if it shared one climate. It does not — which is good news, because it means there is almost always somewhere sensible to go."
      },

      { type: "heading", text: "The two seasons" },
      {
        type: "table",
        columns: ["Season", "Months", "What it means"],
        rows: [
          [
            "Amihan",
            "November to April",
            "The northeast monsoon. Dry and cooler for most of the country, with December to February the most reliable stretch — and the most crowded and expensive."
          ],
          [
            "Habagat",
            "May to October",
            "The southwest monsoon. Wetter and humid, with cheaper rates and fewer people, but choppier boats and poorer underwater visibility from river runoff."
          ]
        ]
      },

      { type: "heading", text: "Typhoon season, honestly" },
      {
        type: "paragraph",
        text: "Typhoon activity peaks between July and October, and is worst in the north and along exposed east coasts. That is the part everyone knows. The part that gets missed is how unevenly it lands."
      },
      {
        type: "list",
        items: [
          "Palawan and the southern Visayas are markedly less exposed than Luzon.",
          "Mindanao and Caraga — Davao, Siargao — sit largely outside the main typhoon belt and are drier year-round.",
          "Eastern Visayas gets more rain than the rest of the country even during the so-called dry months."
        ]
      },
      {
        type: "note",
        tone: "info",
        text: "So writing off July to October across the whole country is the most common planning mistake we hear. It is the right advice for northern Luzon and the wrong advice for Siargao."
      },

      { type: "heading", text: "What the rainy months cost you, and what they save" },
      {
        type: "list",
        items: [
          "Cheaper flights and rooms, and far fewer people at the places worth seeing.",
          "Against that: boat trips cancelled at short notice, remote roads that turn to mud, and diving visibility reduced by runoff.",
          "Domestic flights are the real risk. A cancellation in the rainy months can cost you a day of a short trip, so build in a buffer and know your passenger rights."
        ]
      },

      { type: "heading", text: "A rough rule" },
      {
        type: "list",
        ordered: true,
        items: [
          "Travelling December to February? Almost anywhere works — book early, because everyone else has the same idea.",
          "Travelling March to May? Hot and dry, and the best window for Palawan before habagat arrives.",
          "Travelling June to October? Go south. Siargao, Davao and the southern Visayas are the sensible picks, and you will pay less for them."
        ]
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
