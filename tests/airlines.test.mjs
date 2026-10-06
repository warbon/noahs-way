import assert from "node:assert/strict"
import test from "node:test"

import {
  airlineLogoUrl,
  findAirlinesInText,
  normalizeAirlines,
  resolveAirline
} from "../lib/airlines.ts"
import { buildPackageCaption } from "../lib/facebook/post-caption.ts"

test("an entry resolves by code, name or alias, and an unlisted airline keeps its name", () => {
  assert.deepEqual(resolveAirline("5J"), { code: "5J", name: "Cebu Pacific" })
  assert.deepEqual(resolveAirline("cebu pacific"), { code: "5J", name: "Cebu Pacific" })
  assert.deepEqual(resolveAirline("PAL"), { code: "PR", name: "Philippine Airlines" })
  assert.deepEqual(resolveAirline("T’way"), { code: "TW", name: "T'way Air" })
  assert.deepEqual(resolveAirline("  Sunlight   Air "), { name: "Sunlight Air" })
})

test("normalizing stores listed airlines by code, once each, and caps the list", () => {
  assert.deepEqual(normalizeAirlines(["Cebu Pacific", "5J", " jeju air ", "", "Sunlight Air", "sunlight air"]), [
    "5J",
    "7C",
    "Sunlight Air"
  ])
  assert.deepEqual(normalizeAirlines(["PR", "5J", "Z2", "7C", "KE"]), ["PR", "5J", "Z2", "7C"])
  assert.deepEqual(normalizeAirlines(["x".repeat(61)]), [])
  assert.deepEqual(normalizeAirlines("5J"), [])
})

test("airlines are found in poster text by name and by flight number", () => {
  assert.deepEqual(findAirlinesInText("Flight: 5J 188 MNL–ICN, 6:25 PM – 11:45 PM."), ["5J"])
  assert.deepEqual(findAirlinesInText("Roundtrip airfare via Cebu Pacific with 20kg baggage"), ["5J"])
  assert.deepEqual(findAirlinesInText("Jeju Air 7C 2104 MNL-ICN / 7C2103 ICN-MNL"), ["7C"])
  assert.deepEqual(findAirlinesInText("via PAL or Cebu Pacific"), ["PR", "5J"])
  // The longer name wins, and is not read a second time as the shorter one.
  assert.deepEqual(findAirlinesInText("Flights on Thai AirAsia"), ["FD"])
  assert.deepEqual(findAirlinesInText("Philippines AirAsia Z2 128"), ["Z2"])
})

test("ordinary words that resemble airlines are not read as airlines", () => {
  assert.deepEqual(findAirlinesInText("Gyeongbok Palace with hanbok wearing experience"), [])
  assert.deepEqual(findAirlinesInText("Thai massage and a night market"), [])
  assert.deepEqual(findAirlinesInText("Transfer MNL-CEB, then Day 2 tour"), [])
  assert.deepEqual(findAirlinesInText("Dubai, United Arab Emirates"), [])
  assert.deepEqual(findAirlinesInText("Visit Ana's café, then Eva's bakery"), [])
  assert.deepEqual(findAirlinesInText("Travel period DEC 30-JAN 02, 2027"), [])
})

test("logos are requested at twice the drawn size", () => {
  assert.equal(airlineLogoUrl("5J", 60, 24), "https://pics.avs.io/120/48/5J.png")
})

test("the Facebook caption names the airlines under the destination", () => {
  const pkg = {
    id: "korea-winter",
    category: "international",
    title: "Heartfelt Korea Winter",
    details: "6 Days / 4 Nights",
    previewImage: "",
    imagePath: "",
    price: "from PHP 39,888",
    destination: "Seoul, South Korea",
    airlines: ["7C", "Sunlight Air"]
  }
  const lines = buildPackageCaption(pkg, { packageUrl: "https://example.com/korea" }).split("\n")
  assert.equal(lines[1], "📍 Seoul, South Korea")
  assert.equal(lines[2], "✈️ Via Jeju Air / Sunlight Air")
  assert.equal(
    buildPackageCaption({ ...pkg, airlines: undefined }, { packageUrl: "https://example.com/korea" }).includes("✈️"),
    false
  )
})
