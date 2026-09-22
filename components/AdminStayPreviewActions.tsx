"use client"

import { ArrowLeft, CalendarRange, ExternalLink, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { setStayStatus } from "@/app/admin/stays/[id]/preview/actions"
import { Button, buttonVariants } from "@/components/ui/button"

type AdminStayPreviewActionsProps = {
  id: string
  title: string
  isDraft: boolean
  /** The public URL, once there is one. */
  liveHref: string | null
  /** Upcoming blocked ranges, for the reminder below. */
  upcomingBlocks: number
}

/**
 * The bar under a stay preview: what state the unit is in, and what can be
 * done with it.
 *
 * Simpler than the package equivalent because a condo has no Page post to
 * make. What it adds instead is the availability reminder — a unit published
 * with an empty calendar tells guests every night is free, which is the one
 * mistake this screen exists to catch before it reaches anyone.
 *
 * Status changes go through a server action and then refresh, so the bar
 * always describes the unit as stored rather than as this component last
 * assumed.
 */
export default function AdminStayPreviewActions({
  id,
  title,
  isDraft,
  liveHref,
  upcomingBlocks
}: AdminStayPreviewActionsProps) {
  const router = useRouter()
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ message: string; tone: "ok" | "error" } | null>(null)
  const [, startTransition] = useTransition()

  const editHref = `/admin/stays?edit=${encodeURIComponent(id)}`
  const disabled = busy !== null

  async function changeStatus(status: "draft" | "published") {
    setBusy(status)
    setNotice(null)

    try {
      const result = await setStayStatus(id, status)
      if (!result.ok) {
        setNotice({ message: result.error, tone: "error" })
        return
      }

      setNotice({
        message:
          status === "published"
            ? `Published “${title}”. Guests can see it and request dates now.`
            : `“${title}” is back to a draft and no longer on the website.`,
        tone: "ok"
      })
      startTransition(() => router.refresh())
    } finally {
      setBusy(null)
      setConfirmingUnpublish(false)
    }
  }

  return (
    // Room at the bottom of the page behind this, so it never covers content.
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
            {notice.message}
          </p>
        ) : null}

        {/*
          Shown while it still matters — before publishing, and after, for as
          long as the calendar is empty. An empty calendar is not an error, but
          it is a promise that every night is free.
        */}
        {upcomingBlocks === 0 ? (
          <p className="text-sm text-amber-900">
            No dates are blocked, so guests will see every night as available.{" "}
            <Link
              href={`/admin/stays?dates=${encodeURIComponent(id)}`}
              className="font-medium underline underline-offset-4"
            >
              Block the nights it is taken
            </Link>{" "}
            before you share this.
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
            <span className="text-muted-foreground">
              {upcomingBlocks === 0
                ? "No blocked dates"
                : `${upcomingBlocks} upcoming blocked range${upcomingBlocks === 1 ? "" : "s"}`}
            </span>
          </div>

          {confirmingUnpublish ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Hide it from the website?</span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={disabled}
                onClick={() => changeStatus("draft")}
              >
                {busy ? "Working…" : "Confirm"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => setConfirmingUnpublish(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {isDraft ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled}
                  onClick={() => changeStatus("published")}
                >
                  {busy === "published" ? "Publishing…" : "Publish"}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => setConfirmingUnpublish(true)}
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
              <Link
                href={`/admin/stays?dates=${encodeURIComponent(id)}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                Dates
              </Link>
              <Link href={editHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Link>
              <Link href="/admin/stays" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Condo Stays
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
