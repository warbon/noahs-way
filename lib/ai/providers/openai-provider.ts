import OpenAI from "openai"
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions"

import {
  AgentError,
  type AgentMessage,
  type AgentProvider,
  type AgentStopReason,
  type AgentStreamEvent,
  type AgentToolDefinition,
  type AgentTurnParams
} from "@/lib/ai/provider-types"

const DEFAULT_MODEL = "gpt-4.1"

/**
 * Flattens the neutral message shape onto OpenAI's chat format.
 *
 * The shapes are not one-to-one: a single neutral user message carrying several
 * tool results becomes several `role: "tool"` messages, because OpenAI expects
 * one message per `tool_call_id`.
 */
function toOpenAiMessages(system: string, messages: AgentMessage[]): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [{ role: "system", content: system }]

  for (const message of messages) {
    if (message.role === "assistant") {
      const text = message.parts
        .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join("")

      const toolCalls = message.parts
        .filter((part): part is Extract<typeof part, { type: "tool_call" }> => part.type === "tool_call")
        .map((part) => ({
          id: part.id,
          type: "function" as const,
          function: { name: part.name, arguments: JSON.stringify(part.input) }
        }))

      // An assistant turn with neither text nor tool calls is not a valid
      // message; skipping it keeps a stalled turn from poisoning the history.
      if (!text && toolCalls.length === 0) continue

      result.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
      })
      continue
    }

    for (const part of message.parts) {
      if (part.type === "tool_result") {
        result.push({ role: "tool", tool_call_id: part.toolCallId, content: part.content })
      } else if (part.type === "text") {
        result.push({ role: "user", content: part.text })
      }
    }
  }

  return result
}

function toOpenAiTools(tools: AgentToolDefinition[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>
    }
  }))
}

function toStopReason(finishReason: string | null | undefined): AgentStopReason {
  switch (finishReason) {
    case "tool_calls":
      return "tool_use"
    case "length":
      return "max_tokens"
    case "content_filter":
      return "refusal"
    default:
      return "end_turn"
  }
}

function wrapError(error: unknown): AgentError {
  if (error instanceof OpenAI.RateLimitError) {
    return new AgentError("rate_limited", "OpenAI rate limit reached", { cause: error })
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return new AgentError("unconfigured", "OpenAI rejected the API key", { cause: error })
  }
  if (error instanceof OpenAI.APIError) {
    return new AgentError("upstream", `OpenAI API error ${error.status}`, { cause: error })
  }
  return new AgentError("unknown", "OpenAI request failed", { cause: error })
}

type PendingCall = { id: string; name: string; args: string }

export function createOpenAiProvider(): AgentProvider {
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL

  let client: OpenAI | undefined
  function getClient() {
    if (!client) client = new OpenAI()
    return client
  }

  async function* streamTurn(params: AgentTurnParams): AsyncIterable<AgentStreamEvent> {
    try {
      const stream = await getClient().chat.completions.create(
        {
          model,
          stream: true,
          // Streaming responses omit usage unless it is explicitly requested.
          stream_options: { include_usage: true },
          messages: toOpenAiMessages(params.system, params.messages),
          tools: toOpenAiTools(params.tools)
        },
        { signal: params.signal }
      )

      // Tool call arguments arrive as JSON fragments keyed by index, so they are
      // accumulated here and parsed once the stream is complete.
      const pending = new Map<number, PendingCall>()
      let finishReason: string | null | undefined
      let usage: { inputTokens: number; outputTokens: number } | undefined

      for await (const chunk of stream) {
        // The usage-bearing chunk carries no choices, so it is read first.
        if (chunk.usage) {
          usage = {
            inputTokens: chunk.usage.prompt_tokens,
            outputTokens: chunk.usage.completion_tokens
          }
        }

        const choice = chunk.choices[0]
        if (!choice) continue

        if (choice.finish_reason) finishReason = choice.finish_reason

        if (choice.delta?.content) {
          yield { type: "text_delta", text: choice.delta.content }
        }

        for (const call of choice.delta?.tool_calls ?? []) {
          const existing = pending.get(call.index) ?? { id: "", name: "", args: "" }
          pending.set(call.index, {
            id: call.id ?? existing.id,
            name: call.function?.name ?? existing.name,
            args: existing.args + (call.function?.arguments ?? "")
          })
        }
      }

      for (const call of Array.from(pending.values())) {
        if (!call.name) continue

        let input: Record<string, unknown> = {}
        try {
          const parsed: unknown = call.args ? JSON.parse(call.args) : {}
          if (parsed && typeof parsed === "object") input = parsed as Record<string, unknown>
        } catch (error) {
          // Malformed arguments are the model's mistake, not a transport fault.
          // An empty input lets the tool report its own validation error back.
          console.error(`[chat] Could not parse ${call.name} arguments`, error)
        }

        yield { type: "tool_call", id: call.id || `call_${call.name}`, name: call.name, input }
      }

      yield { type: "done", stopReason: toStopReason(finishReason), usage }
    } catch (error) {
      throw wrapError(error)
    }
  }

  return { name: "openai", model, streamTurn }
}
