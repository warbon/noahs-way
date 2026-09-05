import { unstable_noStore as noStore } from "next/cache"

import { encryptSecret, previewSecret } from "@/lib/ai/secret-box"
import {
  defaultFacebookSettings,
  type FacebookSettingsRecord,
  type FacebookSettingsRepository,
  type FacebookSettingsUpdate
} from "@/lib/facebook/settings-types"
import { fileFacebookSettingsRepository } from "@/lib/repositories/file-facebook-settings-repository"
import { kvFacebookSettingsRepository } from "@/lib/repositories/kv-facebook-settings-repository"

/** A Page token is a long opaque string; these bounds only catch a bad paste. */
const MIN_TOKEN_LENGTH = 40
const MAX_TOKEN_LENGTH = 1000

function getRepository(): FacebookSettingsRepository {
  // Mirrors the package, inquiry and AI repositories so every store switches together.
  return process.env.PACKAGE_STORE?.trim().toLowerCase() === "kv"
    ? kvFacebookSettingsRepository
    : fileFacebookSettingsRepository
}

/** `noStore()` so an admin's toggle is never served from a cached KV read. */
export async function getFacebookSettings(): Promise<FacebookSettingsRecord> {
  noStore()
  return getRepository().readFacebookSettings()
}

export class FacebookSettingsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FacebookSettingsValidationError"
  }
}

/**
 * Shape checks only. Whether Facebook accepts the token is a question only
 * Facebook can answer — that is what the panel's Test button is for — but
 * catching a truncated paste here saves an admin from a share that fails
 * halfway through.
 */
function toStoredToken(value: string): Pick<
  FacebookSettingsRecord,
  "accessToken" | "accessTokenPreview"
> {
  const token = value.trim()

  if (/\s/.test(token)) {
    throw new FacebookSettingsValidationError(
      "Page access token must not contain spaces or line breaks"
    )
  }
  if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) {
    throw new FacebookSettingsValidationError("That does not look like a complete Page access token")
  }

  return { accessToken: encryptSecret(token), accessTokenPreview: previewSecret(token) }
}

/**
 * A Page id is digits; a handle is the vanity name from the Page URL. Both work
 * as the Graph API's node id, so both are accepted, but a pasted full URL is
 * reduced to the handle rather than rejected — it is the likeliest paste.
 */
function toStoredPageId(value: string): string {
  const trimmed = value.trim()
  const fromUrl = trimmed.match(/^https?:\/\/(?:www\.|m\.)?facebook\.com\/([^/?#]+)/i)
  const candidate = (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "").replace(/\/+$/, "")

  if (!/^[A-Za-z0-9.\-_]{1,120}$/.test(candidate)) {
    throw new FacebookSettingsValidationError(
      "Enter the Page's numeric id or its @handle, not a full URL with a path"
    )
  }

  return candidate
}

/**
 * Read-modify-write. The last admin to press Save wins, which is the same
 * bargain every other repository here makes and fine for a one-operator panel.
 */
export async function updateFacebookSettings(
  update: FacebookSettingsUpdate
): Promise<FacebookSettingsRecord> {
  const repository = getRepository()
  const current = (await repository.readFacebookSettings()) ?? defaultFacebookSettings()

  const next: FacebookSettingsRecord = { ...current, updatedAt: new Date().toISOString() }

  if ("enabled" in update && update.enabled !== undefined) {
    next.enabled = update.enabled
  }

  if ("pageId" in update) {
    const pageId = update.pageId?.trim()
    next.pageId = pageId ? toStoredPageId(pageId) : null
    // The cached name belongs to whichever Page was last verified. Changing the
    // id makes it a lie, so it goes until the next successful test.
    if (next.pageId !== current.pageId) next.pageName = null
  }

  if ("hashtags" in update) {
    const hashtags = update.hashtags?.trim().replace(/\s+/g, " ")
    next.hashtags = hashtags ? hashtags : null
  }

  if ("pageName" in update) {
    const pageName = update.pageName?.trim()
    next.pageName = pageName ? pageName : null
  }

  if ("accessToken" in update) {
    if (!update.accessToken || update.accessToken.trim() === "") {
      // Explicit clear. An omitted `accessToken` never reaches here, so a save
      // that leaves the password field blank keeps the stored token.
      next.accessToken = null
      next.accessTokenPreview = null
    } else {
      Object.assign(next, toStoredToken(update.accessToken))
    }
  }

  await repository.writeFacebookSettings(next)
  return next
}
