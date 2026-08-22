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

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === "tool_use" && block.name === TOOL_NAME
      )

      if (!toolUse) {
        throw new PosterExtractionError("The reader returned nothing usable for this image.", 422)
      }

      return {
        // Already parsed by the SDK — never string-match the serialized input.
        fields: toolUse.input as PosterExtraction,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      }
    }
  }
}
