/**
 * Content for the standalone Philippines page.
 *
 * Kept apart from `destinations.ts` because the domestic page is a different
 * shape: the international ones exist to frame a handful of packages, while
 * this one has to stand on its own — there is nothing published for the local
 * category yet, and this is the country the agency knows best.
 */

export type Region = {
  name: string
  /** The one-line reason to pick this region over another. */
  known: string
  places: { name: string; note: string }[]
  bestMonths: string
}

export const regions: Region[] = [
  {
    name: "Northern Luzon",
    known: "Mountains, cool air and colonial towns — the part of the country that does not look tropical",
    places: [
      { name: "Baguio and Sagada", note: "Pine forest, cold mornings, hanging coffins and caves" },
      { name: "Banaue and Batad", note: "Rice terraces carved into the mountainside, a UNESCO site" },
      { name: "Vigan", note: "Cobbled Spanish colonial streets, also UNESCO-listed" },
      { name: "Batanes", note: "Rolling hills and stone houses. Hardest to reach and most weather-dependent" },
      { name: "La Union and Zambales", note: "Surf and coves within a drive of Manila" }
    ],
    bestMonths: "November to April. Batanes is best February to May, when flights are least likely to be cancelled."
  },
  {
    name: "Palawan",
    known: "The postcard coastline, and the most fee-heavy province to visit",
    places: [
      { name: "El Nido", note: "Limestone karst lagoons and island-hopping tours" },
      { name: "Coron", note: "Japanese shipwreck diving and hot springs" },
      { name: "Puerto Princesa", note: "The underground river, a UNESCO site and a New7Wonder of Nature" }
    ],
    bestMonths:
      "November to May. Less exposed to typhoons than Luzon, but boat tours still get cancelled in rough weather."
  },
  {
    name: "The Visayas",
    known: "The easiest pairing of city and island, which is why most first domestic trips land here",
    places: [
      { name: "Cebu", note: "A real city with waterfalls, canyoneering and diving within a few hours" },
      { name: "Bohol", note: "Chocolate Hills, tarsiers, and Panglao's beaches" },
      { name: "Boracay", note: "White Beach, and the most developed resort island in the country" },
      { name: "Siquijor and Dumaguete", note: "Quieter, with Apo Island's reef offshore" },
      { name: "Iloilo and Guimaras", note: "Food, heritage churches and mangoes" }
    ],
    bestMonths:
      "November to May. The eastern Visayas stay wetter than the rest even in the dry months."
  },
  {
    name: "Mindanao and Caraga",
    known: "Drier year-round and largely outside the typhoon belt — the sensible pick when the rest of the country is wet",
    places: [
      { name: "Siargao", note: "Cloud 9 and the surf coast, with lagoons and rock pools inland" },
      { name: "Davao", note: "Mount Apo, the country's highest peak, and the fruit everyone argues about" },
      { name: "Camiguin", note: "A small island of volcanoes, springs and waterfalls" },
      { name: "Cagayan de Oro", note: "White-water rafting on the river that runs through it" }
    ],
    bestMonths: "Reliable most of the year. March to October suits Siargao's surf season."
  }
]

export const practicalities = [
  {
    title: "No passport, no visa",
    text: "A valid government ID gets you on a domestic flight. There is no travel tax and no immigration counter, which makes a last-minute domestic trip possible in a way an overseas one is not."
  },
  {
    title: "Budget past the airfare",
    text: "Islands charge environmental and terminal fees on arrival, usually in cash and never included in the fare. Boracay alone is ₱300 plus ₱150 each way."
  },
  {
    title: "Book flights early for peak season",
    text: "December to February, Holy Week and the long weekends fill up and get expensive. Domestic fares move faster than international ones."
  },
  {
    title: "Weather is regional, not national",
    text: "The country does not have one season. When Luzon is under habagat, Mindanao is usually fine — which is the single most useful thing to know when planning."
  }
]
