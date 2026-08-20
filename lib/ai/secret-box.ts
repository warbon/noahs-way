import crypto from "node:crypto"

/**
 * Envelope encryption for provider API keys held in the settings store.
 *
 * Keys typed into the admin panel end up in Vercel KV (or a JSON file in dev),
 * neither of which is a secrets manager: KV contents are readable by anything
 * holding the store's REST token, and a JSON file is one stray `cat` away from
 * a terminal transcript. Encrypting at rest means a leaked store dump is not a
 * leaked API key.
 *
 * The key is derived from ADMIN_SESSION_SECRET, which every deployment running
 * the admin panel already has to set. The trade-off is deliberate and worth
 * stating: rotating ADMIN_SESSION_SECRET makes stored keys undecryptable. That
 * is recoverable — the panel reports it and an admin re-enters the key — and it
 * beats introducing a second secret nobody remembers to set.
 */

const SECRET_VERSION = "v1"

function getEncryptionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()

  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable")
  }

  // Hashed rather than used raw so any secret length yields the 32 bytes
  // AES-256 requires.
  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])

  return [
    SECRET_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    cipher.getAuthTag().toString("base64url")
  ].join(".")
}

/**
 * Returns null rather than throwing on anything unreadable — a rotated secret,
 * a hand-edited store, a value written by an older format. Callers treat that
 * as "no key configured", which degrades to the environment variable instead of
 * taking the whole site down.
 */
export function decryptSecret(blob: string): string | null {
  const [version, ivRaw, ciphertextRaw, tagRaw] = blob.split(".")

  if (version !== SECRET_VERSION || !ivRaw || !ciphertextRaw || !tagRaw) return null

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivRaw, "base64url")
    )
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"))

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextRaw, "base64url")),
      decipher.final()
    ]).toString("utf8")
  } catch {
    return null
  }
}

/** The only part of a key that may reach the browser. */
export function previewSecret(plaintext: string) {
  return plaintext.slice(-4)
}
