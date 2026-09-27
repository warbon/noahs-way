import { Redis } from "@upstash/redis"

let redis: Redis | null = null

/** Uses the Vercel Marketplace credential names already configured by this app. */
export function getRedis(): Redis {
  if (redis) return redis

  const url = process.env.KV_REST_API_URL?.trim()
  const token = process.env.KV_REST_API_TOKEN?.trim()
  if (!url || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN")
  }

  redis = new Redis({ url, token })
  return redis
}
