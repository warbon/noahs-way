/**
 * Admin-managed configuration for sharing packages to the Facebook Page.
 *
 * Mirrors lib/ai/settings-types.ts on purpose: the two panels store the same
 * shape of thing — a secret plus the switch that decides whether it is used —
 * so they behave the same way. Nullable fields mean "not decided here" and fall
 * through to the environment; `enabled` is the one setting that does not, because
 * a token sitting in the environment is not consent to post to a public Page.
 */

export type FacebookSettingsRecord = {
  /**
   * The master switch. Defaults to OFF so a deployment that happens to carry a
   * token cannot post to the Page until somebody turned this on.
   */
  enabled: boolean
  /** Numeric Page id, or the Page's @handle — the Graph API accepts either. */
  pageId: string | null
  /** AES-GCM ciphertext from lib/ai/secret-box.ts. Never plaintext. */
  accessToken: string | null
  /** Last four characters, so the panel can show which token is stored. */
  accessTokenPreview: string | null
  /**
   * Cached from the last successful connection test. Purely for display — it
   * lets the panel say which Page is on the other end of the token instead of
   * showing a bare numeric id.
   */
  pageName: string | null
  /** Appended verbatim to every caption, e.g. "#NoahsWayTravel #Cebu". */
  hashtags: string | null
  updatedAt: string | null
}

/**
 * A patch, not a replacement. An omitted field is left alone; an explicit null
 * on `accessToken` clears the stored token. The panel never round-trips a token
 * it cannot see, so "unchanged" has to be expressible.
 */
export type FacebookSettingsUpdate = {
  enabled?: boolean
  pageId?: string | null
  accessToken?: string | null
  pageName?: string | null
  hashtags?: string | null
}

export type FacebookSettingsRepository = {
  readFacebookSettings(): Promise<FacebookSettingsRecord>
  writeFacebookSettings(record: FacebookSettingsRecord): Promise<void>
}

export function defaultFacebookSettings(): FacebookSettingsRecord {
  return {
    enabled: false,
    pageId: null,
    accessToken: null,
    accessTokenPreview: null,
    pageName: null,
    hashtags: null,
    updatedAt: null
  }
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Coerces whatever the store holds into a usable record. Written defensively
 * rather than validated strictly: a malformed blob must not be able to take the
 * admin panel down, so anything unrecognised falls back to its default.
 */
export function normalizeFacebookSettings(value: unknown): FacebookSettingsRecord {
  if (!value || typeof value !== "object") return defaultFacebookSettings()

  const record = value as Record<string, unknown>
  const accessToken = readNullableString(record.accessToken)

  return {
    // Anything other than an explicit `true` leaves sharing off.
    enabled: record.enabled === true,
    pageId: readNullableString(record.pageId),
    accessToken,
    // A preview without a token is meaningless and would show a stale hint.
    accessTokenPreview: accessToken ? readNullableString(record.accessTokenPreview) : null,
    pageName: readNullableString(record.pageName),
    hashtags: readNullableString(record.hashtags),
    updatedAt: readNullableString(record.updatedAt)
  }
}

/** Where the token the share would actually use comes from. */
export type FacebookTokenSource = "settings" | "env" | "none"

/**
 * What the admin panel is allowed to see.
 *
 * The access token never appears here in any form beyond its last four
 * characters. A Page token can post as the business, so a settings endpoint that
 * can hand one back turns an admin session hijack into a hijacked Page.
 */
export type PublicFacebookSettings = {
  enabled: boolean
  pageId: string | null
  pageName: string | null
  hashtags: string | null
  hasStoredToken: boolean
  tokenPreview: string | null
  hasEnvToken: boolean
  hasEnvPageId: boolean
  updatedAt: string | null
  /** What the stored settings and the environment add up to, after precedence. */
  resolved: {
    pageId: string | null
    tokenSource: FacebookTokenSource
    /** True when a share attempted right now would have everything it needs. */
    available: boolean
    /** A token is stored but ADMIN_SESSION_SECRET can no longer decrypt it. */
    storedTokenUnreadable: boolean
  }
}
