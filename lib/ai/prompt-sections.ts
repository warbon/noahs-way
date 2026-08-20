/**
 * The system prompt's section headings, in one place.
 *
 * buildSystemPrompt() renders these and the leak guard matches on them. They
 * were previously a hand-copied list in two files, which had already drifted:
 * a section was added to the prompt and never registered with the guard, so a
 * reply leaking that section passed unnoticed. Sharing the constant means a
 * rename cannot silently disable the guard.
 */
export const PROMPT_SECTIONS = {
  WHAT_YOU_DO: "## What you do",
  SCOPE: "## Scope — this matters",
  GROUNDING: "## Grounding rules",
  INTERFACE: "## Using the interface",
  COMPLETING: "## Completing a booking",
  TONE: "## Tone and escalation"
} as const

export const PROMPT_SECTION_HEADINGS = Object.values(PROMPT_SECTIONS)
