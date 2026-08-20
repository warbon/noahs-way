import { kv } from "@vercel/kv"

import type { ChatBookingDraft } from "@/lib/ai/genui-types"
import type { AgentMessage } from "@/lib/ai/provider-types"

/**
 * Conversation state lives on the server, keyed by an httpOnly cookie.
 *
 * The browser never holds the transcript, so a visitor cannot rewrite what the
 * assistant "said" before confirming a booking — which matters because the
 * confirm step reads the draft from here, not from the request body.
 *
 * Backend selection follows the repositories: `PACKAGE_STORE=kv` uses Vercel
 * KV, anything else falls back to process memory, which is fine for local dev
 * and expected to be lost on redeploy.
 */

/** Read by both the chat route and the booking route, so they cannot disagree. */
export const CHAT_COOKIE_NAME = "chat_session"

const DEFAULT_TTL_SECONDS = 60 * 60 * 24

export function getChatTtlSeconds() {
  const configured = Number.parseInt(process.env.CHAT_SESSION_TTL_SECONDS?.trim() || "", 10)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_SECONDS
}

/**
 * Chat state follows the rate limiter, not the package repository: it keys off
 * the presence of KV credentials rather than PACKAGE_STORE.
 *
 * PACKAGE_STORE selects where the *catalog* lives, which is a different
 * decision — gating session state on it meant a developer with working KV
 * credentials silently got the in-process fallback instead.
 */
function isKvMode() {
  return Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim())
}

type MemoryEntry = { value: unknown; expiresAt: number }

/**
 * Hung off globalThis rather than module scope on purpose.
 *
 * The chat route and the booking route are separate bundles, so a module-level
 * Map gives each of them its own copy — a draft staged by one would be
 * invisible to the other, and Confirm would 410. This fallback is for local dev
 * without KV only; on serverless it is still per-instance, which is why KV is
 * the real path.
 */
const globalMemory = globalThis as typeof globalThis & {
  __noahsWayChatStore?: Map<string, MemoryEntry>
}

const memoryStore =
  globalMemory.__noahsWayChatStore ?? (globalMemory.__noahsWayChatStore = new Map())

function memoryGet<T>(key: string): T | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return entry.value as T
}

function memorySet(key: string, value: unknown, ttlSeconds: number) {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

async function readKey<T>(key: string): Promise<T | null> {
  if (!isKvMode()) return memoryGet<T>(key)

  try {
    return (await kv.get<T>(key)) ?? null
  } catch (error) {
    console.error(`[chat] Could not read ${key}`, error)
    return null
  }
}

async function writeKey(key: string, value: unknown) {
  const ttl = getChatTtlSeconds()

  if (!isKvMode()) {
    memorySet(key, value, ttl)
    return
  }

  try {
    await kv.set(key, value, { ex: ttl })
  } catch (error) {
    // A lost transcript degrades the conversation; it must not fail the turn.
    console.error(`[chat] Could not write ${key}`, error)
  }
}

async function deleteKey(key: string) {
  if (!isKvMode()) {
    memoryStore.delete(key)
    return
  }

  try {
    await kv.del(key)
  } catch (error) {
    console.error(`[chat] Could not delete ${key}`, error)
  }
}

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/

/** Session ids arrive from a cookie, so they are validated before keying on them. */
export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value)
}

export function createSessionId() {
  return crypto.randomUUID()
}

function transcriptKey(sessionId: string) {
  return `chat:${sessionId}`
}

function draftKey(sessionId: string) {
  return `chat:${sessionId}:draft`
}

export async function readTranscript(sessionId: string): Promise<AgentMessage[]> {
  const stored = await readKey<AgentMessage[]>(transcriptKey(sessionId))
  return Array.isArray(stored) ? stored : []
}

export async function writeTranscript(sessionId: string, messages: AgentMessage[]) {
  await writeKey(transcriptKey(sessionId), messages)
}

function turnCountKey(sessionId: string) {
  return `chat:${sessionId}:turns`
}

/**
 * Total model-backed turns this session has spent.
 *
 * Separate from the transcript, which is trimmed to a window and so cannot be
 * used to measure lifetime usage.
 */
export async function readTurnCount(sessionId: string) {
  const stored = await readKey<number>(turnCountKey(sessionId))
  return typeof stored === "number" && Number.isFinite(stored) ? stored : 0
}

export async function bumpTurnCount(sessionId: string, current: number) {
  await writeKey(turnCountKey(sessionId), current + 1)
}

export async function readBookingDraft(sessionId: string) {
  return readKey<ChatBookingDraft>(draftKey(sessionId))
}

export async function writeBookingDraft(sessionId: string, draft: ChatBookingDraft) {
  await writeKey(draftKey(sessionId), draft)
}

export async function clearBookingDraft(sessionId: string) {
  await deleteKey(draftKey(sessionId))
}
