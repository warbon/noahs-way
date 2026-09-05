import { resolveFacebookConfigFrom } from "@/lib/facebook/config"
import type {
  FacebookSettingsRecord,
  PublicFacebookSettings
} from "@/lib/facebook/settings-types"

/**
 * Strips the ciphertext before anything leaves the server.
 *
 * Lives beside the settings rather than in the route because a route file may
 * only export request handlers, and both the settings endpoint and anything
 * else that wants to describe the connection need the same projection.
 */
export function toPublicFacebookSettings(
  settings: FacebookSettingsRecord
): PublicFacebookSettings {
  const resolved = resolveFacebookConfigFrom(settings)

  return {
    enabled: settings.enabled,
    pageId: settings.pageId,
    pageName: settings.pageName,
    hashtags: settings.hashtags,
    hasStoredToken: Boolean(settings.accessToken),
    tokenPreview: settings.accessTokenPreview,
    hasEnvToken: Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim()),
    hasEnvPageId: Boolean(process.env.FACEBOOK_PAGE_ID?.trim()),
    updatedAt: settings.updatedAt,
    resolved: {
      pageId: resolved.pageId,
      tokenSource: resolved.tokenSource,
      available: resolved.available,
      storedTokenUnreadable: resolved.storedTokenUnreadable
    }
  }
}
