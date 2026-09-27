import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { isActivityEvent, type ActivityEvent } from "@/lib/activity-types"
import { getRedis } from "@/lib/redis"

const ACTIVITY_JSON_PATH =
  process.env.ACTIVITY_JSON_PATH || path.join(process.cwd(), "data", "activity.json")
const DEFAULT_INDEX_KEY = "activities:index"

function isKv() {
  return process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv"
}

function indexKey() {
  return process.env.ACTIVITY_INDEX_KV_KEY?.trim() || DEFAULT_INDEX_KEY
}

function recordKey(id: string) {
  return `activity:${id}`
}

function bookingIndexKey(id: string) {
  return `activities:booking:${id}`
}

function inquiryIndexKey(id: string) {
  return `activities:inquiry:${id}`
}

async function readFileActivity(): Promise<ActivityEvent[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(ACTIVITY_JSON_PATH, "utf8"))
    return Array.isArray(parsed) ? parsed.filter(isActivityEvent) : []
  } catch {
    return []
  }
}

let fileQueue: Promise<unknown> = Promise.resolve()

export async function appendActivity(event: ActivityEvent): Promise<void> {
  if (isKv()) {
    await getRedis().eval<[string, string, string, string], number>(
      `
        if redis.call("EXISTS", KEYS[1]) == 1 then return 0 end
        redis.call("SET", KEYS[1], ARGV[1])
        redis.call("LPUSH", KEYS[2], ARGV[2])
        if ARGV[3] ~= "" then redis.call("LPUSH", KEYS[3], ARGV[2]) end
        if ARGV[4] ~= "" then redis.call("LPUSH", KEYS[4], ARGV[2]) end
        return 1
      `,
      [
        recordKey(event.id),
        indexKey(),
        event.bookingId ? bookingIndexKey(event.bookingId) : "activities:none:booking",
        event.inquiryId ? inquiryIndexKey(event.inquiryId) : "activities:none:inquiry"
      ],
      [JSON.stringify(event), event.id, event.bookingId ?? "", event.inquiryId ?? ""]
    )
    return
  }

  const operation = fileQueue.then(async () => {
    const events = await readFileActivity()
    if (events.some((item) => item.id === event.id)) return
    await mkdir(path.dirname(ACTIVITY_JSON_PATH), { recursive: true })
    await writeFile(ACTIVITY_JSON_PATH, `${JSON.stringify([event, ...events], null, 2)}\n`, "utf8")
  })
  fileQueue = operation.catch(() => undefined)
  await operation
}

/**
 * Activity is an audit side effect, not the transaction result. A temporary
 * activity-store outage must never make a completed booking mutation look as
 * though it failed and invite the owner to repeat it.
 */
export async function appendActivitySafely(event: ActivityEvent): Promise<boolean> {
  try {
    await appendActivity(event)
    return true
  } catch (error) {
    console.error(`[activity] failed to append ${event.kind} event ${event.id}`, error)
    return false
  }
}

export async function listBookingActivity(
  bookingId: string,
  inquiryId: string,
  limit = 500
): Promise<ActivityEvent[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 500)
  if (!isKv()) {
    const events = await readFileActivity()
    return events
      .filter(
        (event) =>
          event.bookingId === bookingId ||
          event.entityId === bookingId ||
          event.inquiryId === inquiryId ||
          event.entityId === inquiryId
      )
      .slice(0, boundedLimit)
  }

  const redis = getRedis()
  const [bookingIds, inquiryIds] = await Promise.all([
    redis.lrange<string>(bookingIndexKey(bookingId), 0, boundedLimit - 1),
    redis.lrange<string>(inquiryIndexKey(inquiryId), 0, boundedLimit - 1)
  ])
  const ids = Array.from(new Set([...bookingIds, ...inquiryIds])).slice(0, boundedLimit)
  if (!ids.length) return []
  const records = await redis.mget<unknown[]>(...ids.map(recordKey))
  return records
    .filter(isActivityEvent)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export async function listActivity(
  options: { offset?: number; limit?: number } = {}
): Promise<ActivityEvent[]> {
  const offset = Math.max(options.offset ?? 0, 0)
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)

  if (!isKv()) {
    const events = await readFileActivity()
    return events.slice(offset, offset + limit)
  }

  const redis = getRedis()
  const ids = await redis.lrange<string>(indexKey(), offset, offset + limit - 1)
  if (!ids.length) return []
  const records = await redis.mget<unknown[]>(...ids.map(recordKey))
  return records.filter(isActivityEvent)
}

export function createActivityId() {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
