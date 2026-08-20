import Anthropic from "@anthropic-ai/sdk"

import {
  AgentError,
  type AgentMessage,
  type AgentProvider,
  type AgentStopReason,
  type AgentStreamEvent,
  type AgentToolDefinition,
  type AgentTurnParams
} from "@/lib/ai/provider-types"

const DEFAULT_MODEL = "claude-opus-5"

/**
 * Streaming is required rather than optional: `max_tokens` this large would
 * otherwise risk an HTTP timeout, and the widget needs text on screen while the
 * model is still choosing a tool.
 */
const MAX_TOKENS = 64000

function toAnthropicMessages(messages: AgentMessage[]): Anthropic.MessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.parts.map((part): Anthropic.ContentBlockParam => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text }
        case "tool_call":
          return { type: "tool_use", id: part.id, name: part.name, input: part.input }
        case "tool_result":
          return { type: "tool_result", tool_use_id: part.toolCallId, content: part.content }
      }
    })
  }))
}

function toAnthropicTools(tools: AgentToolDefinition[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema
  }))
}

function toStopReason(stopReason: Anthropic.Message["stop_reason"]): AgentStopReason {
  switch (stopReason) {
    case "tool_use":
      return "tool_use"
    case "max_tokens":
      return "max_tokens"
    case "refusal":
      return "refusal"
    default:
      return "end_turn"
  }
}

function wrapError(error: unknown): AgentError {
  if (error instanceof Anthropic.RateLimitError) {
    return new AgentError("rate_limited", "Anthropic rate limit reached", { cause: error })
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new AgentError("unconfigured", "Anthropic rejected the API key", { cause: error })
  }
  if (error instanceof Anthropic.APIError) {
    return new AgentError("upstream", `Anthropic API error ${error.status}`, { cause: error })
  }
  return new AgentError("unknown", "Anthropic request failed", { cause: error })
}

export function createAnthropicProvider(): AgentProvider {
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL

  // Constructed lazily so importing this module without a key is harmless —
  // `isAgentConfigured()` is what gates the feature.
  let client: Anthropic | undefined
  function getClient() {
    if (!client) client = new Anthropic()
    return client
  }

  async function* streamTurn(params: AgentTurnParams): AsyncIterable<AgentStreamEvent> {
    try {
      const stream = getClient().messages.stream(
        {
          model,
          max_tokens: MAX_TOKENS,
          thinking: { type: "adaptive" },
          // A booking conversation is short-horizon; low effort keeps replies
          // quick and cheap without giving up tool-use reliability.
          output_config: { effort: "low" },
          system: params.system,
          tools: toAnthropicTools(params.tools),
          messages: toAnthropicMessages(params.messages)
        },
        { signal: params.signal }
      )

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text_delta", text: event.delta.text }
        }
      }

      const message = await stream.finalMessage()

      // Emitted after the stream so inputs are the SDK's parsed objects rather
      // than partial JSON accumulated by hand.
      for (const block of message.content) {
        if (block.type === "tool_use") {
          yield {
            type: "tool_call",
            id: block.id,
            name: block.name,
            input: (block.input ?? {}) as Record<string, unknown>
          }
        }
      }

      yield { type: "done", stopReason: toStopReason(message.stop_reason) }
    } catch (error) {
      throw wrapError(error)
    }
  }

  return { name: "anthropic", model, streamTurn }
}
