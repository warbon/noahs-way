import { resolveFacebookConfig } from "@/lib/facebook/config"
import {
  FacebookApiError,
  fetchPostPermalink,
  postPagePhoto,
  type FacebookPhotoInput
} from "@/lib/facebook/graph"
import { PackageImageError, downloadPackagePhoto, resolvePackagePhoto } from "@/lib/facebook/package-image"
import { buildPackageCaption } from "@/lib/facebook/post-caption"
import { getPackagesByCategory } from "@/lib/package-repository"
import type { PackageRecord } from "@/lib/package-repository-types"
import { buildPackageHref, derivePackageSlug, resolveSlugCollisions } from "@/lib/package-slug"
import { siteConfig } from "@/lib/site-config"

/**
 * Publishing one stored package to the Page, end to end.
 *
 * Everything that can be wrong is checked before anything is posted, because
 * the failure this guards against is a half-finished post on a public business
 * Page — there is no undo an admin panel can offer for that.
 */

export class FacebookShareError extends Error {
  /** What the API route should answer. 400 is "fix your settings", 502 is "Facebook said no". */
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "FacebookShareError"
    this.status = status
  }
}

export type FacebookShareResult = {
  photoId: string
  /** `{page-id}_{post-id}`, when Facebook published to the feed. */
  postId: string | null
  permalink: string | null
  sharedAt: string
  /** Echoed back so the panel can show exactly what went out. */
  caption: string
}

/**
 * The URL the post points at, resolved the same way the storefront resolves it.
 *
 * Slugs are derived, not stored, and two packages with the same title get `-2`
 * suffixes in catalog order — so deriving the slug from the title alone would
 * publish a link to the wrong package. This asks the catalog instead.
 */
async function resolvePackageUrl(pkg: PackageRecord) {
  if (!/^https?:\/\//i.test(siteConfig.url) || /localhost|127\.0\.0\.1/i.test(siteConfig.url)) {
    throw new FacebookShareError(
      "NEXT_PUBLIC_SITE_URL is still pointing at localhost, so the post would carry a link nobody " +
        "can open. Set it to the live site address before sharing."
    )
  }

  let slug = derivePackageSlug(pkg)

  try {
    const published = resolveSlugCollisions(await getPackagesByCategory(pkg.category))
    const match = published.find((record) => record.id === pkg.id)
    if (match?.slug) slug = match.slug
  } catch (error) {
    // A catalog read failure here only costs us collision handling, which
    // matters for duplicate titles alone — not worth failing the share over.
    console.error("[facebook] Could not resolve the package slug from the catalog", error)
  }

  return `${siteConfig.url.replace(/\/+$/, "")}${buildPackageHref(pkg.category, slug)}`
}

/**
 * Facebook's own fetch of a hosted image can fail for reasons that have nothing
 * to do with this app — a CDN hiccup, a URL it decides it cannot read. Those are
 * recoverable by sending the bytes ourselves, so they are retried once rather
 * than reported to the admin as a failed share.
 */
function isImageFetchFailure(error: FacebookApiError) {
  return (
    error.code === 324 ||
    error.code === 1 ||
    /(fetch|download|url).*(image|photo)|image.*(could not|cannot) be (fetched|downloaded)/i.test(
      error.message
    )
  )
}

export async function sharePackageToFacebook(pkg: PackageRecord): Promise<FacebookShareResult> {
  const config = await resolveFacebookConfig()

  if (config.storedTokenUnreadable) {
    throw new FacebookShareError(
      "The saved Page access token can no longer be decrypted — ADMIN_SESSION_SECRET has changed. " +
        "Re-enter the token in Admin → Facebook."
    )
  }

  if (!config.enabled) {
    throw new FacebookShareError("Facebook sharing is switched off in Admin → Facebook.")
  }

  if (!config.pageId || !config.accessToken) {
    throw new FacebookShareError(
      "No Facebook Page is connected yet. Add the Page id and a Page access token in Admin → Facebook."
    )
  }

  const packageUrl = await resolvePackageUrl(pkg)
  const caption = buildPackageCaption(pkg, { packageUrl, hashtags: config.hashtags })

  let photo: FacebookPhotoInput
  try {
    photo = await resolvePackagePhoto(pkg.imagePath || pkg.previewImage)
  } catch (error) {
    if (error instanceof PackageImageError) throw new FacebookShareError(error.message)
    throw error
  }

  let post
  try {
    post = await postPagePhoto({
      pageId: config.pageId,
      accessToken: config.accessToken,
      caption,
      photo
    })
  } catch (error) {
    if (error instanceof FacebookApiError && photo.kind === "url" && isImageFetchFailure(error)) {
      console.warn("[facebook] Facebook could not fetch the image URL; retrying with an upload")
      post = await postPagePhoto({
        pageId: config.pageId,
        accessToken: config.accessToken,
        caption,
        photo: await downloadPackagePhoto(photo.url)
      }).catch((retryError) => {
        throw retryError instanceof FacebookApiError
          ? new FacebookShareError(retryError.message, 502)
          : retryError
      })
    } else if (error instanceof FacebookApiError) {
      throw new FacebookShareError(error.message, 502)
    } else if (error instanceof PackageImageError) {
      throw new FacebookShareError(error.message)
    } else {
      throw error
    }
  }

  const permalink = post.postId
    ? (await fetchPostPermalink({ postId: post.postId, accessToken: config.accessToken })) ??
      `https://www.facebook.com/${post.postId}`
    : null

  return {
    photoId: post.photoId,
    postId: post.postId,
    permalink,
    sharedAt: new Date().toISOString(),
    caption
  }
}
