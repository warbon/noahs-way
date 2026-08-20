/**
 * Client IP for rate limiting, from the proxy headers Vercel sets.
 *
 * Shared so every rate-limited entry point keys on the same value — a limiter
 * that reads a different header from its neighbour is a limiter with its own
 * private bucket.
 */
export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return headers.get("x-real-ip")?.trim() || "unknown"
}
