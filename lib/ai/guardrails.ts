import { messengerHref, siteConfig } from "@/lib/site-config"

/**
 * Enforced guardrails for the booking assistant.
 *
 * The system prompt tells the model what it is for; this module is what holds
 * when the model does not listen. Everything here is deterministic and runs on
 * the server, so it costs nothing and cannot be argued with.
 *
 * Design bias: let borderline messages through. A visitor asking something
 * oddly-worded about travel must never be blocked, so these patterns only fire
 * on requests that have no plausible booking reading. Topic drift in general is
 * the system prompt's job — this catches the cases where a soft instruction is
 * not enough, and the cases worth refusing without paying for a model call.
 */

export type GuardrailReason =
  | "instruction-probe"
  | "role-reassignment"
  | "code-request"
  | "session-limit"

export type GuardrailVerdict =
  | { allowed: true }
  | { allowed: false; reason: GuardrailReason; reply: string }

const OFF_TOPIC_REPLY =
  `I only help with Noah's Way trips — finding a package and putting together a booking request. ` +
  `For anything else, ${siteConfig.shortName} is on Messenger (${messengerHref}) or ${siteConfig.phone}.`

const SESSION_LIMIT_REPLY =
  `We've covered a lot in this conversation. So a consultant can pick it up properly, message us on Messenger (${messengerHref}) or call ${siteConfig.phone} — ` +
  `they'll have the full picture and can confirm prices and availability.`

/**
 * Attempts to read back or override the operating instructions.
 *
 * Note what is deliberately NOT here: "your rules" and "your guidelines". Those
 * read as a prompt probe in isolation, but they are exactly how a customer asks
 * about cancellation policy or child fares — blocking them would refuse real
 * booking questions. Scope drift of that kind is the system prompt's job; this
 * pattern stays on wording with no travel reading at all.
 */
const INSTRUCTION_PROBE =
  /\b(?:system\s+prompt|your\s+(?:instructions|prompt)\b|initial\s+prompt|repeat\s+(?:the\s+)?(?:above|everything\s+above)|ignore\s+(?:all\s+|any\s+)?(?:previous|prior|earlier|above)\s+instructions?|disregard\s+(?:all\s+|your\s+|the\s+)?(?:previous|prior|above|instructions?))/i

/**
 * Attempts to reassign the assistant's role.
 *
 * "act as our travel agent" is in-scope phrasing, so `act as` is deliberately
 * required to be followed by something other than a travel word — simpler to
 * keep the pattern to the unambiguous jailbreak vocabulary instead.
 */
const ROLE_REASSIGNMENT =
  /\b(?:you\s+are\s+now\s+(?:a|an|my)\b|pretend\s+(?:to\s+be|you\s+are)\b|jailbreak|developer\s+mode|DAN\s+mode|roleplay\s+as\b)/i

/**
 * Using the widget as a free general-purpose coding assistant.
 *
 * Two deliberate narrowings, both learned from false positives:
 *  - "java" is absent. Java is an Indonesian island and a destination this
 *    agency could sell; "give me a Java trip idea" is a booking question.
 *    "javascript" stays, since that has no travel reading.
 *  - the verbs are only "write" and "generate". "create" and "give" are
 *    ordinary booking words ("create a booking", "give me a Bali idea").
 */
const CODE_REQUEST =
  /\b(?:write|generate)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(?:python|javascript|typescript|c\+\+|c#|php|golang|rust|sql|bash|shell|powershell|code|script|program|function|algorithm)\b/i

/** Runs before any model call, so a refused message costs nothing. */
export function screenVisitorMessage(text: string): GuardrailVerdict {
  if (INSTRUCTION_PROBE.test(text)) {
    return { allowed: false, reason: "instruction-probe", reply: OFF_TOPIC_REPLY }
  }

  if (ROLE_REASSIGNMENT.test(text)) {
    return { allowed: false, reason: "role-reassignment", reply: OFF_TOPIC_REPLY }
  }

  if (CODE_REQUEST.test(text)) {
    return { allowed: false, reason: "code-request", reply: OFF_TOPIC_REPLY }
  }

  return { allowed: true }
}

/**
 * One conversation's ceiling, independent of the per-IP limiter.
 *
 * The IP limiter caps burst rate; this caps total spend on a single session, so
 * one visitor cannot sit on the widget all day running up model calls.
 */
export const MAX_SESSION_TURNS = 60

export function sessionLimitVerdict(): GuardrailVerdict {
  return { allowed: false, reason: "session-limit", reply: SESSION_LIMIT_REPLY }
}

/**
 * Catches the model reciting its own instructions back.
 *
 * Matches the prompt's section headers rather than its sentences: several
 * sentences in the prompt are things the assistant should legitimately say
 * ("a consultant will reply within 24 hours"), but no ordinary reply contains
 * "## Grounding rules".
 */
const LEAKED_PROMPT_MARKERS = [
  "## What you do",
  "## Grounding rules",
  "## Using the interface",
  "## Completing a booking",
  "## Tone and escalation"
]

export function looksLikeLeakedInstructions(text: string) {
  return LEAKED_PROMPT_MARKERS.some((marker) => text.includes(marker))
}

export const GUARDRAIL_LEAK_REPLY = OFF_TOPIC_REPLY
