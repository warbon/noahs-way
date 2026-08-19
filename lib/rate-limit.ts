import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

type LimiterOptions = {
  /** Requests allowed per window, per identifier. */
  attempts: number
  window: Duration
  /** Redis key prefix, so limiters don't share buckets. */
  prefix: string
  /**
   * What to do when the limiter is unavailable or throws.
   * "open" allows the request (right for admin login — a store hiccup must not
   * lock the owner out). "closed" blocks it (right for public endpoints, where
   * an outage must not become an open door for spam).
   */
  onError: "open" | "closed"
}

type LimiterState = Ratelimit | null

/**
 * Builds a sliding-window limiter lazily and caches it. Returns null when the
 * Upstash REST credentials are absent (e.g. local file-mode dev).
 */
function createLimiterFactory(options: LimiterOptions) {
  let cached: LimiterState | undefined

  function getLimiter(): LimiterState {
    if (cached !== undefined) return cached

    const url = process.env.KV_REST_API_URL?.trim()
    const token = process.env.KV_REST_API_TOKEN?.trim()

    if (!url || !token) {
      cached = null
      return cached
    }

    cached = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(options.attempts, options.window),
      prefix: options.prefix,
      analytics: false
    })

    return cached
  }

  return async function check(identifier: string): Promise<boolean> {
    const limiter = getLimiter()

    // Unconfigured limiter means local dev without Upstash: allow, so the app
    // stays usable. Only a *configured* limiter that fails is treated as an error.
    if (!limiter) return true

    try {
      const { success } = await limiter.limit(identifier)
      return success
    } catch (error) {
      console.error(`Rate limiter "${options.prefix}" error`, error)
      return options.onError === "open"
    }
  }
}

/** 5 admin-login attempts per IP per minute. Fails open. */
export const checkAdminLoginRateLimit = createLimiterFactory({
  attempts: 5,
  window: "60 s",
  prefix: "ratelimit:admin-login",
  onError: "open"
})

/**
 * 3 inquiry submissions per IP per 10 minutes.
 *
 * Fails OPEN deliberately. The whole point of this endpoint is that leads stop
 * being lost, so a Redis outage must not start rejecting genuine customers —
 * that would recreate the exact bug we're fixing. Spam protection during an
 * outage still comes from the honeypot check in the route, which needs no
 * network call.
 */
export const checkInquiryRateLimit = createLimiterFactory({
  attempts: 3,
  window: "600 s",
  prefix: "ratelimit:inquiry",
  onError: "open"
})
