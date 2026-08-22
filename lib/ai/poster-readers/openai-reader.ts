import OpenAI from "openai"

import {
  EXTRACTION_SCHEMA,
  PosterExtractionError,
  READ_INSTRUCTION,
  SYSTEM_PROMPT,
  TOOL_NAME,
  stripNulls,
  toOpenAiStrictSchema,
  type PosterReadResult,
  type PosterReader,
  type SupportedMedia
} from "@/lib/ai/poster-reader-types"

/**
 * Reads a poster with an OpenAI vision model, via structured outputs.
 *
 * Structured outputs rather than a forced tool call: it is OpenAI's equivalent
 * guarantee — the reply must match the schema — and it avoids the tool-choice
 * plumbing for a call that only ever wants one object back. The safety property
 * is the same: a poster's own text cannot become an instruction, because the
 * response shape is fixed.
 */

/** Vision-capable and cheap enough for a per-poster call. */
const DEFAULT_MODEL = "gpt-4.1"

/** Built once — the transform walks the whole schema. */
const STRICT_SCHEMA = toOpenAiStrictSchema(EXTRACTION_SCHEMA)

export function createOpenAiPosterReader(apiKey: string, model?: string): PosterReader {
  const resolvedModel = model || DEFAULT_MODEL
  const client = new OpenAI({ apiKey })

  return {
    name: "openai",
    model: resolvedModel,
    async read(imageBase64: string, media: SupportedMedia): Promise<PosterReadResult> {
      let completion: OpenAI.Chat.Completions.ChatCompletion
      try {
        completion = await client.chat.completions.create({
          model: resolvedModel,
          max_completion_tokens: 16000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: TOOL_NAME,
              strict: true,
              schema: STRICT_SCHEMA
            }
          },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  // Base64 travels as a data URI here rather than as a source
                  // object, which is the main shape difference from Anthropic.
                  image_url: { url: `data:${media};base64,${imageBase64}`, detail: "high" }
                },
                { type: "text", text: READ_INSTRUCTION }
              ]
            }
          ]
        })
      } catch (error) {
        if (error instanceof OpenAI.AuthenticationError) {
          throw new PosterExtractionError("The OpenAI API key was rejected.", 502)
        }
        if (error instanceof OpenAI.RateLimitError) {
          throw new PosterExtractionError("Rate limited by OpenAI — try again shortly.", 429)
        }
        if (error instanceof OpenAI.APIError) {
          throw new PosterExtractionError(`OpenAI error ${error.status}: ${error.message}`, 502)
        }
        throw new PosterExtractionError("Could not reach OpenAI.", 502)
      }

      const choice = completion.choices[0]

      // A refusal is a normal, successful response with a refusal field set —
      // it is not thrown, so it has to be checked before reading content.
      if (choice?.message?.refusal) {
        throw new PosterExtractionError(
          `OpenAI declined to read this image: ${choice.message.refusal}`,
          422
        )
      }

      const content = choice?.message?.content
      if (!content) {
        throw new PosterExtractionError("The reader returned nothing usable for this image.", 422)
      }

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(content) as Record<string, unknown>
      } catch {
        throw new PosterExtractionError("The reader's reply was not valid JSON.", 502)
      }

      return {
        // Strict mode makes every field required-but-nullable, so the nulls
        // standing in for "not on the poster" are dropped back to absent.
        fields: stripNulls(parsed),
        usage: {
          inputTokens: completion.usage?.prompt_tokens ?? 0,
          outputTokens: completion.usage?.completion_tokens ?? 0
        }
      }
    }
  }
}
