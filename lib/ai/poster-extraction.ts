import { resolveAgentConfig } from "@/lib/ai/config"
import {
  PosterExtractionError,
  isSupportedMedia,
  type PosterExtraction,
  type PosterReadUsage,
  type PosterReader
} from "@/lib/ai/poster-reader-types"
import { createAnthropicPosterReader } from "@/lib/ai/poster-readers/anthropic-reader"
import { createOpenAiPosterReader } from "@/lib/ai/poster-readers/openai-reader"

/**
 * Reads a package poster and proposes the fields that describe it.
 *
 * This exists because the catalog's whole failure mode was content trapped in
 * JPEGs: every itinerary, inclusion and price the business sells was printed on
 * a flyer and nowhere in the data, so package pages said "details on request"
 * and Google saw nothing. Typing a dense flyer in by hand is the reason that
 * kept happening.
 *
 * Three rules shape the design:
 *
 * 1. It PROPOSES, never saves. The result fills the admin form for a human to
 *    check and correct. A model misreading ₱36,888 as ₱36,388 must cost a
 *    correction, not a mispriced booking.
 * 2. It transcribes, never infers. The prompt forbids guessing: a field that is
 *    not legibly printed comes back absent rather than plausible.
 * 3. Poster text is data, not instruction. A flyer is untrusted input, so the
 *    reply is constrained to one fixed schema — the worst a crafted image can
 *    do is put bad strings in fields the admin is already reviewing.
 *
 * Both providers are supported. The per-provider work lives in
 * `lib/ai/poster-readers/`; this module only chooses one, retries a thin read,
 * and reports back.
 */

export { PosterExtractionError }
export type { PosterExtraction }

export type PosterExtractionResult = {
  fields: PosterExtraction
  provider: string
  model: string
  usage: PosterReadUsage
}

/**
 * Override for either provider, e.g. `claude-opus-5` or `gpt-4.1`.
 *
 * Deliberately separate from the assistant's AI_MODEL: the chat model is picked
 * for cost across many short turns, this one for reading a dense flyer once.
 */
function modelOverride() {
  return process.env.AI_POSTER_MODEL?.trim() || undefined
}

/**
 * True when a result is thin enough to be an early stop rather than a poster
 * that genuinely lacks these sections.
 *
 * Measured, not assumed: reading the same poster three times returned 637,
 * 3174 and 1630 output tokens — the first stopped after the title and skipped
 * the price, itinerary and inclusions the other two both found.
 */
function looksIncomplete(fields: PosterExtraction) {
  // The itinerary alone is the tell. An earlier version only retried when the
  // price, itinerary AND inclusions were all missing, which never fired — the
  // observed failure is a read that gets the headline price and then skips the
  // day panels entirely. Every package poster in this catalogue has an
  // itinerary, so zero days back is a failed read whatever else came with it.
  return !fields.itinerary?.length
}

async function resolveReader(): Promise<PosterReader> {
  const config = await resolveAgentConfig()

  if (!config.apiKey) {
    throw new PosterExtractionError(
      `No ${config.provider} API key is configured. Add one in Admin → AI Assistant.`,
      503
    )
  }

  switch (config.provider) {
    case "anthropic":
      return createAnthropicPosterReader(config.apiKey, modelOverride())
    case "openai":
      return createOpenAiPosterReader(config.apiKey, modelOverride())
    default:
      throw new PosterExtractionError(
        `Reading posters is not supported for the ${config.provider} provider.`,
        501
      )
  }
}

export async function extractPosterFields(
  imageBase64: string,
  mediaType: string
): Promise<PosterExtractionResult> {
  if (!isSupportedMedia(mediaType)) {
    throw new PosterExtractionError(`Unsupported image type: ${mediaType}`, 415)
  }

  const reader = await resolveReader()

  let attempt = await reader.read(imageBase64, mediaType)

  // One retry only. A second thin result means the poster really is sparse (or
  // is not a package poster), and a retry loop would just burn the budget.
  if (looksIncomplete(attempt.fields)) {
    attempt = await reader.read(imageBase64, mediaType)
  }

  return {
    fields: attempt.fields,
    provider: reader.name,
    model: reader.model,
    usage: attempt.usage
  }
}
