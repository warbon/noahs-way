import Anthropic from "@anthropic-ai/sdk"

import {
  EXTRACTION_SCHEMA,
  PosterExtractionError,
  READ_INSTRUCTION,
  SYSTEM_PROMPT,
  TOOL_NAME,
  type PosterExtraction,
  type PosterReadResult,
  type PosterReader,
  type SupportedMedia
} from "@/lib/ai/poster-reader-types"

/**
 * Reads a poster with Claude, via a single forced strict tool call.
 *
 * Forcing one tool is what keeps a poster's own text from being treated as
 * instruction: the reply cannot be prose, and cannot be a different shape, so
 * the worst a crafted image achieves is bad strings in fields an admin is
 * already reviewing.
 */

/** Measured default. See the note in poster-extraction.ts on model choice. */
const DEFAULT_MODEL = "claude-sonnet-5"

/**
 * Folds several partial extractions into one.
 *
 * A field already filled is never overwritten, and empty values — null,
 * undefined, an empty array — do not count as filled, so a later block can
 * still supply something an earlier one left blank.
 */
function mergeExtractions(inputs: unknown[]): PosterExtraction {
  const merged: Record<string, unknown> = {}

  for (const input of inputs) {
    if (!input || typeof input !== "object") continue

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (value == null) continue
      if (Array.isArray(value) && value.length === 0) continue

      const existing = merged[key]
      const alreadyFilled =
        existing != null && !(Array.isArray(existing) && existing.length === 0)

      if (!alreadyFilled) merged[key] = value
    }
  }

  return merged as PosterExtraction
}

export function createAnthropicPosterReader(apiKey: string, model?: string): PosterReader {
  const resolvedModel = model || DEFAULT_MODEL
  const client = new Anthropic({ apiKey })

  return {
    name: "anthropic",
    model: resolvedModel,
    async read(imageBase64: string, media: SupportedMedia): Promise<PosterReadResult> {
      let response: Anthropic.Message
      try {
        response = await client.messages.create({
          model: resolvedModel,
          max_tokens: 16000,
          // Dense flyers reward looking harder; this runs once per poster.
          thinking: { type: "adaptive" },
          output_config: { effort: "xhigh" },
          system: SYSTEM_PROMPT,
          tools: [
            {
              name: TOOL_NAME,
              description: "Record the fields transcribed from the package poster.",
              strict: true,
              input_schema: EXTRACTION_SCHEMA
            }
          ],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: media, data: imageBase64 }
                },
                { type: "text", text: READ_INSTRUCTION }
              ]
            }
          ]
        })
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          throw new PosterExtractionError("The Anthropic API key was rejected.", 502)
        }
        if (error instanceof Anthropic.RateLimitError) {
          throw new PosterExtractionError("Rate limited by Anthropic — try again shortly.", 429)
        }
        if (error instanceof Anthropic.APIError) {
          throw new PosterExtractionError(`Anthropic error ${error.status}: ${error.message}`, 502)
        }
        throw new PosterExtractionError("Could not reach Anthropic.", 502)
      }

      /*
        A dense poster comes back as SEVERAL tool_use blocks, not one.

        This used to take the first and drop the rest, which silently lost
        whichever half of the poster did not land in that block — a read would
        return the itinerary and inclusions but no summary, or the reverse,
        depending on what the model happened to emit first. Both halves were
        present in the response the whole time.

        Earlier blocks win each field, since the model refines rather than
        contradicts, and a later block repeating a field carries the same value.
      */
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === "tool_use" && block.name === TOOL_NAME
      )

      if (toolUses.length === 0) {
        throw new PosterExtractionError("The reader returned nothing usable for this image.", 422)
      }

      return {
        // Already parsed by the SDK — never string-match the serialized input.
        fields: mergeExtractions(toolUses.map((block) => block.input)),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      }
    }
  }
}
