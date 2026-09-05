/**
 * The thin slice of the Facebook Graph API this site needs: publish a photo to
 * a Page, and read the Page back so an admin can confirm which one a token
 * belongs to.
 *
 * Deliberately written against `fetch` rather than an SDK. Two endpoints do not
 * justify a dependency that ships the whole Marketing API, and the failure mode
 * that matters here — Facebook answering 200 with an `error` object, or 400 with
 * a message an admin can act on — is easier to surface honestly by hand.
 */

/** Pinned rather than floating: Graph versions are deprecated on a schedule, and
 *  a silent bump is how a working integration breaks on someone else's calendar. */
const DEFAULT_GRAPH_VERSION = "v21.0"

const REQUEST_TIMEOUT_MS = 30_000

function getGraphVersion() {
  return process.env.FACEBOOK_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION
}

function graphUrl(path: string) {
  return `https://graph.facebook.com/${getGraphVersion()}/${path.replace(/^\/+/, "")}`
}

export class FacebookApiError extends Error {
  readonly code?: number
  readonly subcode?: number
  readonly traceId?: string

  constructor(message: string, details: { code?: number; subcode?: number; traceId?: string } = {}) {
    super(message)
    this.name = "FacebookApiError"
    this.code = details.code
    this.subcode = details.subcode
    this.traceId = details.traceId
  }
}

type GraphErrorBody = {
  error?: {
    message?: unknown
    code?: unknown
    error_subcode?: unknown
    error_user_msg?: unknown
    fbtrace_id?: unknown
  }
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : undefined
}

/**
 * Facebook reports failures in the body, and its `message` is usually the most
 * actionable thing available ("(#200) Requires pages_manage_posts permission").
 * `error_user_msg`, when present, is the version written for a human, so it wins.
 */
function toApiError(payload: unknown, status: number): FacebookApiError {
  const error = (payload as GraphErrorBody | null)?.error

  const message =
    (typeof error?.error_user_msg === "string" && error.error_user_msg.trim()) ||
    (typeof error?.message === "string" && error.message.trim()) ||
    `Facebook rejected the request (HTTP ${status})`

  return new FacebookApiError(message, {
    code: toNumber(error?.code),
    subcode: toNumber(error?.error_subcode),
    traceId: typeof error?.fbtrace_id === "string" ? error.fbtrace_id : undefined
  })
}

async function graphRequest(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<unknown> {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...requestInit } = init
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(url, { ...requestInit, signal: controller.signal, cache: "no-store" })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new FacebookApiError("Facebook did not respond in time")
    }
    throw new FacebookApiError(
      error instanceof Error ? `Could not reach Facebook: ${error.message}` : "Could not reach Facebook"
    )
  } finally {
    clearTimeout(timeout)
  }

  const payload = (await response.json().catch(() => null)) as unknown

  // A 200 can still carry an error object, so the body is checked either way.
  if (!response.ok || (payload && typeof payload === "object" && "error" in payload)) {
    throw toApiError(payload, response.status)
  }

  return payload
}

export type FacebookPageProfile = {
  id: string
  name: string
  category: string | null
  link: string | null
}

/** Confirms a token works and says which Page it speaks for. */
export async function fetchPageProfile({
  pageId,
  accessToken
}: {
  pageId: string
  accessToken: string
}): Promise<FacebookPageProfile> {
  const url = new URL(graphUrl(pageId))
  url.searchParams.set("fields", "id,name,category,link")
  url.searchParams.set("access_token", accessToken)

  const payload = (await graphRequest(url.toString())) as Record<string, unknown> | null

  if (!payload || typeof payload.id !== "string") {
    throw new FacebookApiError("Facebook returned an unexpected response for this Page")
  }

  return {
    id: payload.id,
    name: typeof payload.name === "string" ? payload.name : payload.id,
    category: typeof payload.category === "string" ? payload.category : null,
    link: typeof payload.link === "string" ? payload.link : null
  }
}

/**
 * The photo to publish, in whichever form the caller can supply it.
 *
 * `url` is the cheaper path — Facebook fetches the image itself — but it only
 * works for an address Facebook's servers can reach, which rules out a local
 * dev server and any private deployment. `binary` always works, so it is both a
 * first choice for local files and the fallback when a URL fetch is refused.
 */
export type FacebookPhotoInput =
  | { kind: "url"; url: string }
  | { kind: "binary"; bytes: Buffer; filename: string; contentType: string }

export type FacebookPhotoPost = {
  photoId: string
  /** `{page-id}_{post-id}`. Absent only if Facebook declines to publish to feed. */
  postId: string | null
}

/**
 * Publishes a photo with a caption to the Page's timeline.
 *
 * `/photos` rather than `/feed` with a link: a native photo post is what shows
 * up full-width in the feed, and it is the format a travel package is actually
 * read in. The package URL rides along in the caption.
 */
export async function postPagePhoto({
  pageId,
  accessToken,
  caption,
  photo
}: {
  pageId: string
  accessToken: string
  caption: string
  photo: FacebookPhotoInput
}): Promise<FacebookPhotoPost> {
  const endpoint = graphUrl(`${pageId}/photos`)

  const form = new FormData()
  form.set("access_token", accessToken)
  form.set("caption", caption)
  form.set("published", "true")

  if (photo.kind === "url") {
    form.set("url", photo.url)
  } else {
    form.set(
      "source",
      new Blob([new Uint8Array(photo.bytes)], { type: photo.contentType }),
      photo.filename
    )
  }

  const payload = (await graphRequest(endpoint, {
    method: "POST",
    body: form,
    // An upload of several megabytes over a slow link needs more room than a read.
    timeoutMs: 60_000
  })) as Record<string, unknown> | null

  if (!payload || typeof payload.id !== "string") {
    throw new FacebookApiError("Facebook accepted the upload but returned no post id")
  }

  return {
    photoId: payload.id,
    postId: typeof payload.post_id === "string" ? payload.post_id : null
  }
}

/**
 * Best-effort permalink lookup. A share that succeeded must not be reported as
 * failed because the follow-up read did, so this returns null rather than
 * throwing and the caller falls back to a constructed URL.
 */
export async function fetchPostPermalink({
  postId,
  accessToken
}: {
  postId: string
  accessToken: string
}): Promise<string | null> {
  try {
    const url = new URL(graphUrl(postId))
    url.searchParams.set("fields", "permalink_url")
    url.searchParams.set("access_token", accessToken)

    const payload = (await graphRequest(url.toString(), { timeoutMs: 10_000 })) as Record<
      string,
      unknown
    > | null

    return typeof payload?.permalink_url === "string" ? payload.permalink_url : null
  } catch (error) {
    console.error("[facebook] Could not read the permalink for a published post", error)
    return null
  }
}
