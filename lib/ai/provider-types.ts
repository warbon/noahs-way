/**
 * Provider-neutral contract for the booking assistant.
 *
 * Mirrors the repository and notifier seams elsewhere in `lib/`: one contract,
 * several implementations, picked by an env var. The chat route and the whole
 * UI are written against these types only, so swapping Anthropic for OpenAI
 * touches nothing outside `lib/ai/providers/`.
 */

export type AgentTextPart = {
  type: "text"
  text: string
}

export type AgentToolCallPart = {
  type: "tool_call"
  id: string
  name: string
  /** Already parsed. Providers stream this as JSON text; never string-match it. */
  input: Record<string, unknown>
}

export type AgentToolResultPart = {
  type: "tool_result"
  toolCallId: string
  /** JSON-encoded so both providers can carry it as an opaque string. */
  content: string
}

export type AgentPart = AgentTextPart | AgentToolCallPart | AgentToolResultPart

export type AgentMessage = {
  role: "user" | "assistant"
  parts: AgentPart[]
}

/**
 * The subset of JSON Schema both providers accept for tool parameters. Kept
 * deliberately narrow — anything exotic tends to be supported by one provider
 * and silently ignored by the other.
 */
export type AgentToolSchema = {
  type: "object"
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties?: false
}

export type AgentToolDefinition = {
  name: string
  description: string
  parameters: AgentToolSchema
}

export type AgentStopReason = "end_turn" | "tool_use" | "max_tokens" | "refusal"

export type AgentStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown> }
  | { type: "done"; stopReason: AgentStopReason }

export type AgentTurnParams = {
  system: string
  messages: AgentMessage[]
  tools: AgentToolDefinition[]
  signal?: AbortSignal
}

export type AgentProvider = {
  /** Used in logs so a failing turn can be traced to the right adapter. */
  name: string
  model: string
  streamTurn(params: AgentTurnParams): AsyncIterable<AgentStreamEvent>
}

/** Distinguishes "we should retry / degrade" from "this is a bug". */
export type AgentErrorCode = "unconfigured" | "rate_limited" | "refused" | "upstream" | "unknown"

export class AgentError extends Error {
  readonly code: AgentErrorCode

  constructor(code: AgentErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "AgentError"
    this.code = code
  }
}

/** The one message a visitor should ever see when the assistant breaks. */
export const AGENT_FALLBACK_MESSAGE =
  "Sorry — I'm having trouble right now. Please message us on Messenger or call us and a travel consultant will help you straight away."
