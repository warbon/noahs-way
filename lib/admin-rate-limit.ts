import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Allow this many admin-login attempts per IP per window before blocking.
const ATTEMPTS = 5
const WINDOW = "60 s" as const

type LimiterState = Ratelimit | null

let cachedLimiter: LimiterState | undefined

/**
 * Builds the limiter lazily. Returns null when the KV/Upstash REST credentials
 * are absent (e.g. local file-mode dev), so login degrades to unthrottled
 * rather than erroring. On Vercel the KV integration injects these vars.
 */
function getLimiter(): LimiterState {
  if (cachedLimiter !== undefined) return cachedLimiter

  const url = process.env.KV_REST_API_URL?.trim()
  const token = process.env.KV_REST_API_TOKEN?.trim()

  if (!url || !token) {
    cachedLimiter = null
    return cachedLimiter
  }

  cachedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(ATTEMPTS, WINDOW),
    prefix: "ratelimit:admin-login",
    analytics: false
  })

  return cachedLimiter
}

/**
 * Records one login attempt for the given client identifier (IP). Returns
 * whether the attempt is allowed. Fails open: if the limiter is disabled or the
 * KV call throws, the attempt is allowed so a store hiccup can't lock out login.
 */
export async function checkAdminLoginRateLimit(identifier: string): Promise<boolean> {
  const limiter = getLimiter()
  if (!limiter) return true

  try {
    const { success } = await limiter.limit(identifier)
    return success
  } catch (error) {
    console.error("Admin login rate limiter error; allowing attempt", error)
    return true
  }
}
