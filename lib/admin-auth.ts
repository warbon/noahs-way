import type { NextRequest } from "next/server"

export const ADMIN_SESSION_COOKIE_NAME = "admin_session"
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

const ADMIN_SESSION_VERSION = "v1"
const encoder = new TextEncoder()

let cachedSigningKeyPromise: Promise<CryptoKey> | null = null

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable")
  }

  return secret
}

function toBase64Url(buffer: ArrayBuffer) {
  if (typeof btoa !== "function" && typeof Buffer !== "undefined") {
    return Buffer.from(new Uint8Array(buffer)).toString("base64url")
  }

  let binary = ""
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

async function getSigningKey() {
  if (!cachedSigningKeyPromise) {
    cachedSigningKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(getAdminSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
  }

  return cachedSigningKeyPromise
}

async function signValue(value: string) {
  const key = await getSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return toBase64Url(signature)
}

export async function createAdminSessionToken(now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${ADMIN_SESSION_VERSION}.${expiresAt}`
  const signature = await signValue(payload)
  return `${payload}.${signature}`
}

export async function verifyAdminSessionToken(token: string, now = Date.now()) {
  const [version, expiresAtRaw, signature] = token.split(".")

  if (!version || !expiresAtRaw || !signature) return false
  if (version !== ADMIN_SESSION_VERSION) return false

  const expiresAt = Number.parseInt(expiresAtRaw, 10)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  const expectedSignature = await signValue(`${version}.${expiresAtRaw}`)
  return signature === expectedSignature
}

export async function isAdminRequestAuthenticated(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value
  if (!token) return false

  try {
    return await verifyAdminSessionToken(token)
  } catch {
    return false
  }
}
