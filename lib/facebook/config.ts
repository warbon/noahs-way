import { decryptSecret } from "@/lib/ai/secret-box"
import { getFacebookSettings } from "@/lib/facebook/settings-repository"
import type {
  FacebookSettingsRecord,
  FacebookTokenSource
} from "@/lib/facebook/settings-types"

/**
 * What a share would actually run with, after the panel and the environment
 * have both had their say.
 *
 * Precedence matches the AI assistant's: a value saved in the admin panel wins
 * over the matching environment variable, and the environment covers whatever
 * the panel has not been told. `enabled` is deliberately outside that rule —
 * see settings-types.ts.
 */
export type FacebookConfig = {
  enabled: boolean
  pageId: string | null
  accessToken: string | null
  tokenSource: FacebookTokenSource
  /** A token is stored but ADMIN_SESSION_SECRET can no longer decrypt it. */
  storedTokenUnreadable: boolean
  /** Everything a share needs is present and switched on. */
  available: boolean
  hashtags: string | null
}

function envValue(key: string) {
  return process.env[key]?.trim() || null
}

export function resolveFacebookConfigFrom(settings: FacebookSettingsRecord): FacebookConfig {
  const storedToken = settings.accessToken ? decryptSecret(settings.accessToken) : null
  const storedTokenUnreadable = Boolean(settings.accessToken) && storedToken === null
  const envToken = envValue("FACEBOOK_PAGE_ACCESS_TOKEN")

  const accessToken = storedToken ?? envToken
  const tokenSource: FacebookTokenSource = storedToken ? "settings" : envToken ? "env" : "none"
  const pageId = settings.pageId ?? envValue("FACEBOOK_PAGE_ID")

  return {
    enabled: settings.enabled,
    pageId,
    accessToken,
    tokenSource,
    storedTokenUnreadable,
    available: Boolean(settings.enabled && pageId && accessToken),
    hashtags: settings.hashtags
  }
}

export async function resolveFacebookConfig(): Promise<FacebookConfig> {
  return resolveFacebookConfigFrom(await getFacebookSettings())
}
