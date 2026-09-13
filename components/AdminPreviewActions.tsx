"use client"

import { ArrowLeft, ExternalLink, Facebook, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { setPackageStatus } from "@/app/admin/packages/[id]/preview/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { postPackageToFacebook } from "@/lib/admin-facebook-client"

type AdminPreviewActionsProps = {
  id: string
  title: string
  isDraft: boolean
  facebookPostId?: string
  facebookPostedAt?: string
  facebookPermalink?: string
  /** The public URL, once there is one. */
  liveHref: string | null
  /** Whether a share attempted now would have a Page and token to use. */
  facebookAvailable: boolean
}

/** Actions that take the package somewhere public ask once before they go. */
type Pending = "publish-and-post" | "post" | "unpublish" | null

function formatDate(iso: string | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

/**
 * The bar under a package preview: what state it is in, and what can be done
 * with it — publish, post to the Page, take it back down, or go and fix it.
 *
 * Status changes go through a server action and then refresh the page, so the
 * bar always describes the package as it is stored, not as this component last
 * assumed it to be.
 */
export default function AdminPreviewActions({
  id,
  title,
  isDraft,
  facebookPostId,
  facebookPostedAt,
  facebookPermalink,
  liveHref,
  facebookAvailable
}: AdminPreviewActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ message: string; href: string | null; tone: "ok" | "error" } | null>(null)
  const [, startTransition] = useTransition()

  const postedOn = formatDate(facebookPostedAt)
  const editHref = `/admin/packages?edit=${encodeURIComponent(id)}`

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function changeStatus(status: "draft" | "published") {
    const result = await setPackageStatus(id, status)
    if (!result.ok) {
      setNotice({ message: result.error, href: null, tone: "error" })
      return null
    }
    return result.package
  }

  async function publish() {
    setBusy("publish")
    setNotice(null)
    try {
      const saved = await changeStatus("published")
      if (saved) {
        setNotice({ message: `Published “${title}”. Customers can see it now.`, href: null, tone: "ok" })
        refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  async function unpublish() {
    setBusy("unpublish")
    setNotice(null)
    try {
      const saved = await changeStatus("draft")
      if (saved) {
        setNotice({ message: `“${title}” is a draft again and hidden from the website.`, href: null, tone: "ok" })
        refresh()
      }
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  /** Publishes first when needed: the share route refuses a draft. */
  async function post(publishFirst: boolean) {
    setBusy(publishFirst ? "publish-and-post" : "post")
    setNotice(null)
    try {
      let current = { id, title, facebookPostId }
      if (publishFirst) {
        const saved = await changeStatus("published")
        if (!saved) return
        current = { id: saved.id, title: saved.title, facebookPostId: saved.facebookPostId }
      }

      const outcome = await postPackageToFacebook(current, publishFirst ? "Published. " : "")
      const failed = !outcome.href && !/^(Published\. )?Posted/.test(outcome.message)
      setNotice({ message: outcome.message, href: outcome.href, tone: failed ? "error" : "ok" })
      refresh()
    } finally {
      setBusy(null)
      setPending(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-[0_-8px_30px_rgba(6,12,24,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 md:px-8">
        {notice ? (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={
              notice.tone === "error"
                ? "text-sm font-medium text-destructive"
                : "text-sm font-medium text-emerald-700"
            }
          >
            {notice.message}{" "}
            {notice.href ? (
              <a href={notice.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                View post
              </a>
            ) : null}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={
                isDraft
                  ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                  : "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900"
              }
            >
              {isDraft ? "Draft" : "Published"}
            </span>
            {facebookPostId ? (
              facebookPermalink ? (
                <a
                  href={facebookPermalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-900 hover:underline"
                >
                  <Facebook className="h-3 w-3" aria-hidden="true" />
                  {postedOn ? `Posted ${postedOn}` : "Posted"}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-900">
                  <Facebook className="h-3 w-3" aria-hidden="true" />
                  {postedOn ? `Posted ${postedOn}` : "Posted"}
                </span>
              )
            ) : null}
            <span className="text-muted-foreground">
              {isDraft ? "Preview — customers can't see this yet." : "Preview of the live page."}
            </span>
          </div>

          {pending ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {pending === "unpublish"
                  ? "Hide it from the website?"
                  : pending === "publish-and-post"
                    ? "Publish it and post it to the Page?"
                    : facebookPostId
                      ? "Post it to the Page again?"
                      : "Post it to the Page?"}
              </span>
              <Button
                type="button"
                size="sm"
                variant={pending === "unpublish" ? "destructive" : "default"}
                disabled={disabled}
                onClick={() =>
                  pending === "unpublish" ? unpublish() : post(pending === "publish-and-post")
                }
              >
                {busy ? "Working…" : "Confirm"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setPending(null)}>
                Cancel
              </Button>
              {pending !== "unpublish" && !facebookAvailable ? (
                <p className="basis-full text-sm text-amber-900">
                  Facebook sharing is not connected, so the post will be refused —{" "}
                  <Link href="/admin/facebook" className="font-medium underline underline-offset-4">
                    connect the Page
                  </Link>{" "}
                  first.{pending === "publish-and-post" ? " The package will still be published." : ""}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <>
                  <Button type="button" size="sm" disabled={disabled} onClick={publish}>
                    {busy === "publish" ? "Publishing…" : "Publish"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setPending("publish-and-post")}
                  >
                    <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
                    Publish &amp; post to Facebook
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" disabled={disabled} onClick={() => setPending("post")}>
                    <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
                    {facebookPostId ? "Repost to Facebook" : "Post to Facebook"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setPending("unpublish")}
                  >
                    Unpublish to draft
                  </Button>
                  {liveHref ? (
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      Open live page
                    </a>
                  ) : null}
                </>
              )}
              <Link href={editHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Link>
              <Link href="/admin/packages" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Package Manager
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
