"use client"

import { ExternalLink, Facebook, Pencil, Plus, Search, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from "react"

import AdminListSkeleton from "@/components/AdminListSkeleton"
import AdminPackageFormFields from "@/components/AdminPackageFormFields"
import AdminSidePanel from "@/components/AdminSidePanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SplitButton, splitButtonItemClass } from "@/components/ui/split-button"
import type { AdminPackageCatalog, AdminPackageRecord } from "@/lib/admin-package-types"
import type { PublicFacebookSettings } from "@/lib/facebook/settings-types"
import type { PackageCategory } from "@/lib/package-data"
import { formatPackagePrice } from "@/lib/price"

type CategoryFilter = "all" | PackageCategory
type StatusFilter = "all" | "published" | "draft"

type PanelState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; pkg: AdminPackageRecord }

/** The panel's save buttons live in the sticky footer, outside the form. */
const PANEL_FORM_ID = "admin-package-form"

/** What the footer button that submitted the form asked for. */
type PanelAction = "draft" | "publish" | "publish-and-post"

/**
 * Read off the submit event rather than remembered in a ref: a ref set by one
 * package's "post to Facebook" could still be sitting there when the next panel
 * is submitted with the Enter key. The submitter is whatever was clicked this
 * time, and for Enter it is the form's default button — the primary action.
 */
function readPanelAction(event: FormEvent<HTMLFormElement>): PanelAction {
  const submitter = (event.nativeEvent as SubmitEvent).submitter
  const value = submitter?.dataset.panelAction
  return value === "draft" || value === "publish-and-post" ? value : "publish"
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

/** What the banner should say after a post attempt, and where it can link. */
type PostOutcome = { message: string; href: string | null }

/**
 * Posts one saved package to the Page and turns every ending into something the
 * banner can say. Deliberately never throws: one caller has already committed a
 * save it must not pretend did not happen.
 */
async function postPackageToFacebook(
  pkg: AdminPackageRecord,
  prefix = ""
): Promise<PostOutcome> {
  try {
    const response = await fetch(`/api/admin/packages/${pkg.id}/facebook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The API refuses a second post unless it is asked twice on purpose, and
      // the confirm step the admin just passed through is that purpose.
      body: JSON.stringify({ force: Boolean(pkg.facebookPostId) })
    })
    const payload = (await response.json().catch(() => null)) as {
      alreadyPosted?: { permalink: string | null }
      share?: { permalink: string | null; recorded: boolean }
    } | null

    if (response.status === 409) {
      return {
        message: `${prefix}It was already posted to the Page, so nothing was posted again — use Repost on the row if you meant to.`,
        href: payload?.alreadyPosted?.permalink ?? null
      }
    }

    if (!response.ok) {
      return {
        message: `${prefix}${getApiErrorMessage(payload) ?? "Could not post to Facebook."}`,
        href: null
      }
    }

    return {
      // A post that went out but was not recorded is the one case worth
      // spelling out, because the next click would quietly publish a duplicate.
      message:
        payload?.share?.recorded === false
          ? `${prefix}Posted “${pkg.title}” to Facebook, but it could not be marked as posted here — check the Page before posting it again.`
          : `${prefix}Posted “${pkg.title}” to Facebook.`,
      href: payload?.share?.permalink ?? null
    }
  } catch {
    // The request may well have landed, so this must not claim it did not.
    return {
      message: `${prefix}The network dropped before Facebook answered — check the Page before posting it again.`,
      href: null
    }
  }
}

function normalizeCatalog(payload: unknown): AdminPackageCatalog | null {
  if (!payload || typeof payload !== "object") return null
  const packages = (payload as Record<string, unknown>).packages
  if (!packages || typeof packages !== "object") return null

  const record = packages as Record<string, unknown>
  if (!Array.isArray(record.local) || !Array.isArray(record.international)) return null

  return {
    local: record.local as AdminPackageRecord[],
    international: record.international as AdminPackageRecord[]
  }
}

function isDraft(pkg: AdminPackageRecord) {
  return pkg.status === "draft"
}

/** The date only — the hour a package was announced is not something anyone acts on. */
function formatShareDate(iso: string | undefined) {
  if (!iso) return null

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date)
}

/**
 * Newest first, so a package the admin just added is the first thing they see.
 *
 * Without this the list was local-then-international in file order, which put a
 * brand new international package below all fifteen local ones — the opposite
 * of where you look for something you just created.
 *
 * Records created before `createdAt` existed cannot be dated honestly, so they
 * keep their existing relative order and sit underneath the dated ones rather
 * than being given an invented timestamp. Both repositories prepend on create,
 * so that leftover order is already newest-first within each category.
 */
function sortByNewestFirst(packages: AdminPackageRecord[]) {
  return packages
    .map((pkg, index) => ({ pkg, index }))
    .sort((a, b) => {
      const aCreated = a.pkg.createdAt
      const bCreated = b.pkg.createdAt

      if (aCreated && bCreated) {
        // Equal timestamps fall through to index so the order stays stable.
        const diff = bCreated.localeCompare(aCreated)
        return diff !== 0 ? diff : a.index - b.index
      }

      if (aCreated) return -1
      if (bCreated) return 1
      return a.index - b.index
    })
    .map((entry) => entry.pkg)
}

export default function AdminPackageManagerPanel() {
  const router = useRouter()

  const [catalog, setCatalog] = useState<AdminPackageCatalog>({ local: [], international: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const [panel, setPanel] = useState<PanelState>({ mode: "closed" })
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeHref, setNoticeHref] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [facebook, setFacebook] = useState<PublicFacebookSettings | null>(null)
  const [pendingShareId, setPendingShareId] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)

  // Labels only. `saving` still does the disabling; posting is split out
  // because the share route can hold the request for up to a minute.
  const [savePhase, setSavePhase] = useState<"saving" | "posting">("saving")
  const [pendingPanelPost, setPendingPanelPost] = useState(false)
  const confirmPostRef = useRef<HTMLButtonElement | null>(null)

  const loadPackages = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    try {
      const response = await fetch("/api/admin/packages", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setLoadError(getApiErrorMessage(payload) ?? "Failed to load packages.")
        return
      }

      const normalized = normalizeCatalog(payload)
      if (!normalized) {
        setLoadError("Unexpected response while loading packages.")
        return
      }

      setCatalog(normalized)
    } catch {
      setLoadError("Network error while loading packages.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPackages()
  }, [loadPackages])

  /** One place to set the banner, so a stale "view post" link can never outlive it. */
  function showNotice(message: string, href: string | null = null) {
    setNotice(message)
    setNoticeHref(href)
  }

  // Best-effort. The list works without this; all it buys is telling an admin
  // that sharing is not connected before they press the button and find out.
  useEffect(() => {
    let cancelled = false

    async function loadFacebookSettings() {
      try {
        const response = await fetch("/api/admin/facebook-settings", { cache: "no-store" })
        if (!response.ok) return
        const payload = (await response.json()) as { settings?: PublicFacebookSettings }
        if (!cancelled && payload.settings) setFacebook(payload.settings)
      } catch {
        /* a missing hint is not worth an error banner */
      }
    }

    void loadFacebookSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const allPackages = useMemo(
    () => sortByNewestFirst([...catalog.local, ...catalog.international]),
    [catalog]
  )

  const visiblePackages = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return allPackages.filter((pkg) => {
      if (categoryFilter !== "all" && pkg.category !== categoryFilter) return false
      if (statusFilter === "draft" && !isDraft(pkg)) return false
      if (statusFilter === "published" && isDraft(pkg)) return false
      if (!needle) return true

      return `${pkg.title} ${pkg.details} ${pkg.destination ?? ""} ${pkg.price}`
        .toLowerCase()
        .includes(needle)
    })
  }, [allPackages, categoryFilter, statusFilter, query])

  const draftCount = allPackages.filter(isDraft).length

  // Never the nullish shorthand: `facebook` is null until the best-effort
  // settings fetch lands, and that is not the same as "not connected".
  const facebookBlocked = facebook !== null && !facebook.resolved.available

  // The split button unmounts under the focused menu item when the confirm
  // step takes its place, which would drop focus to the body.
  useEffect(() => {
    if (pendingPanelPost) confirmPostRef.current?.focus()
  }, [pendingPanelPost])

  function closePanel() {
    setPanel({ mode: "closed" })
    setPanelError(null)
    setPendingPanelPost(false)
    setSavePhase("saving")
  }

  /**
   * Saves the panel, then does whatever the footer button asked for on top.
   *
   * The action is read from the submitter before anything async happens, and
   * status comes from it rather than from a field — with the select gone, the
   * button the admin pressed is the only thing that decides whether a package
   * is on the website.
   */
  async function submitPanel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (panel.mode === "closed" || saving) return

    const action = readPanelAction(event)
    const formData = new FormData(event.currentTarget)
    const isEdit = panel.mode === "edit"

    // An untouched file input still submits an empty File; sending it would
    // fail the create route's size check and pointlessly replace nothing on edit.
    const image = formData.get("image")
    if (image instanceof File && image.size === 0) formData.delete("image")

    // `set`, not `append`: a status control coming back one day must not be
    // able to submit two values.
    formData.set("status", action === "draft" ? "draft" : "published")

    setSaving(true)
    setSavePhase("saving")
    setPanelError(null)

    try {
      let saved: AdminPackageRecord

      try {
        const response = await fetch(
          isEdit ? `/api/admin/packages/${panel.pkg.id}` : "/api/admin/packages",
          { method: isEdit ? "PUT" : "POST", body: formData }
        )
        const payload = (await response.json().catch(() => null)) as {
          package?: AdminPackageRecord
        } | null

        if (!response.ok || !payload?.package) {
          setPanelError(getApiErrorMessage(payload) ?? "Could not save the package.")
          return
        }

        saved = payload.package
      } catch {
        setPanelError("Network error while saving.")
        return
      }

      // Saved. From here the panel closes however the post goes: what it holds
      // is already stale, and the row's Post button is the retry that works.
      let outcome: PostOutcome | null = null
      if (action === "publish-and-post") {
        setSavePhase("posting")
        // `saved`, not `panel.pkg` — a package created a moment ago has no id
        // on the panel, and an edited one may have been posted since it opened.
        outcome = await postPackageToFacebook(saved, "Saved. ")
      }

      await loadPackages()
      showNotice(
        outcome?.message ?? (isEdit ? "Package updated." : "Package created."),
        outcome?.href ?? null
      )
      closePanel()
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
      setSavePhase("saving")
    }
  }

  async function deletePackage(pkg: AdminPackageRecord) {
    setBusyId(pkg.id)
    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown
        showNotice(getApiErrorMessage(payload) ?? "Could not delete the package.")
        return
      }

      setCatalog((prev) => ({
        local: prev.local.filter((item) => item.id !== pkg.id),
        international: prev.international.filter((item) => item.id !== pkg.id)
      }))
      showNotice(`Deleted “${pkg.title}”.`)
      startTransition(() => router.refresh())
    } catch {
      showNotice("Network error while deleting.")
    } finally {
      setBusyId(null)
      setPendingDeleteId(null)
    }
  }

  /** Publishes one package to the Page straight from its row. */
  async function shareToFacebook(pkg: AdminPackageRecord) {
    setSharingId(pkg.id)
    try {
      const outcome = await postPackageToFacebook(pkg)
      // Reloaded even when the post failed: a refusal usually means the row is
      // out of date, which is exactly when it is worth fetching again.
      await loadPackages()
      showNotice(outcome.message, outcome.href)
    } finally {
      setSharingId(null)
      setPendingShareId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Packages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {allPackages.length} total
            {draftCount > 0 ? ` · ${draftCount} hidden from the website` : ""}
          </p>
        </div>

        <Button type="button" onClick={() => setPanel({ mode: "create" })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add package
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 basis-64 space-y-1.5">
          <label htmlFor="package-search" className="text-sm font-medium">
            Search
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="package-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title, destination, price…"
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="local">Local</option>
            <option value="international">International</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className="notice-in flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground"
        >
          <span>{notice}</span>
          {noticeHref ? (
            <a
              href={noticeHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              View post
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </p>
      ) : null}

      {facebook && !facebook.resolved.available ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Facebook sharing is not connected yet, so posting will be refused.{" "}
          <Link href="/admin/facebook" className="font-medium underline underline-offset-4">
            Connect the Page
          </Link>
          .
        </p>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{loadError}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={loadPackages}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <AdminListSkeleton rows={5} withThumbnail />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            Showing {visiblePackages.length} of {allPackages.length}
          </p>

          {visiblePackages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No packages match those filters.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {visiblePackages.map((pkg, index) => (
                <li
                  key={pkg.id}
                  style={{ "--row-index": index } as CSSProperties}
                  className="admin-row-in flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={pkg.previewImage}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  {/* 7rem is the thumbnail (w-24) plus the row gap (gap-4): claiming
                      the rest of the line forces the actions below it on phones.
                      flex-1 would not work here — its 0 basis never triggers the wrap. */}
                  <div className="min-w-0 grow basis-[calc(100%-7rem)] sm:basis-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground sm:truncate">{pkg.title}</p>
                      {isDraft(pkg) ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          Draft
                        </span>
                      ) : null}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                        {pkg.category}
                      </span>
                      {pkg.facebookPostId ? (
                        pkg.facebookPermalink ? (
                          <a
                            href={pkg.facebookPermalink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900 underline-offset-2 hover:underline"
                          >
                            <Facebook className="h-3 w-3" aria-hidden="true" />
                            {formatShareDate(pkg.facebookPostedAt)
                              ? `Posted ${formatShareDate(pkg.facebookPostedAt)}`
                              : "Posted"}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
                            <Facebook className="h-3 w-3" aria-hidden="true" />
                            {formatShareDate(pkg.facebookPostedAt)
                              ? `Posted ${formatShareDate(pkg.facebookPostedAt)}`
                              : "Posted"}
                          </span>
                        )
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{pkg.details}</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatPackagePrice(pkg)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {pendingDeleteId === pkg.id ? (
                      <>
                        <span className="text-sm text-muted-foreground">Delete?</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busyId === pkg.id}
                          onClick={() => deletePackage(pkg)}
                        >
                          {busyId === pkg.id ? "Deleting…" : "Confirm"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : pendingShareId === pkg.id ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {pkg.facebookPostId ? "Post again?" : "Post to the Page?"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={sharingId === pkg.id}
                          onClick={() => shareToFacebook(pkg)}
                        >
                          {sharingId === pkg.id ? "Posting…" : "Confirm"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={sharingId === pkg.id}
                          onClick={() => setPendingShareId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          // A draft has no page to link to, so posting it would
                          // advertise a 404. The status filter is right there.
                          disabled={isDraft(pkg)}
                          title={
                            isDraft(pkg)
                              ? "Publish this package on the website before posting it"
                              : pkg.facebookPostId
                                ? "Post this package to the Page again"
                                : "Post this package to the Facebook Page"
                          }
                          onClick={() => setPendingShareId(pkg.id)}
                        >
                          <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{pkg.facebookPostId ? "Repost" : "Post"}</span>
                          <span className="sr-only"> {pkg.title} to Facebook</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPanel({ mode: "edit", pkg })}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Edit</span>
                          <span className="sr-only"> {pkg.title}</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`Delete ${pkg.title}`}
                          onClick={() => setPendingDeleteId(pkg.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <AdminSidePanel
        open={panel.mode !== "closed"}
        onClose={closePanel}
        title={panel.mode === "edit" ? "Edit package" : "Add package"}
        description={
          panel.mode === "edit"
            ? // With the status field gone, this line is where an admin reads
              // what the package is doing right now.
              [
                panel.pkg.title,
                isDraft(panel.pkg) ? "Draft" : "Published",
                panel.pkg.facebookPostId
                  ? `Posted to Facebook${
                      formatShareDate(panel.pkg.facebookPostedAt)
                        ? ` ${formatShareDate(panel.pkg.facebookPostedAt)}`
                        : ""
                    }`
                  : null
              ]
                .filter(Boolean)
                .join(" · ")
            : "Fields beyond the basics are optional, but they are what make the package readable on phones and findable on Google."
        }
        footer={
          panel.mode === "closed" ? null : pendingPanelPost ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {panel.mode === "edit" && panel.pkg.facebookPostId
                  ? "Save, publish and post it to the Page again?"
                  : "Save, publish and post it to the Page?"}
              </span>
              <Button
                ref={confirmPostRef}
                type="submit"
                form={PANEL_FORM_ID}
                data-panel-action="publish-and-post"
                disabled={saving}
              >
                {saving ? (savePhase === "posting" ? "Posting…" : "Saving…") : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setPendingPanelPost(false)}
              >
                Cancel
              </Button>

              {facebookBlocked ? (
                <p className="basis-full text-sm text-amber-900">
                  Facebook sharing is not connected, so the post will be refused —{" "}
                  <Link
                    href="/admin/facebook"
                    className="font-medium underline underline-offset-4"
                  >
                    connect the Page
                  </Link>{" "}
                  first. The package will still be saved.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <SplitButton
                label="More save actions"
                disabled={saving}
                menu={
                  <>
                    <button
                      role="menuitem"
                      type="submit"
                      form={PANEL_FORM_ID}
                      data-panel-action="draft"
                      disabled={saving}
                      className={splitButtonItemClass}
                    >
                      {panel.mode === "edit" && !isDraft(panel.pkg)
                        ? "Unpublish to draft"
                        : "Save as draft"}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Kept here, hidden from the website.
                      </span>
                    </button>
                    <button
                      role="menuitem"
                      // Opens the confirm step rather than submitting: this one
                      // ends up on a public Page.
                      type="button"
                      disabled={saving}
                      onClick={() => setPendingPanelPost(true)}
                      className={splitButtonItemClass}
                    >
                      {panel.mode === "edit" && panel.pkg.facebookPostId
                        ? "Publish & repost to Facebook"
                        : "Publish & post to Facebook"}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Saves it, puts it on the website, then posts the poster and details to the
                        Page.
                      </span>
                    </button>
                  </>
                }
              >
                <Button
                  type="submit"
                  form={PANEL_FORM_ID}
                  data-panel-action="publish"
                  disabled={saving}
                >
                  {saving
                    ? savePhase === "posting"
                      ? "Posting…"
                      : "Saving…"
                    : panel.mode === "edit" && !isDraft(panel.pkg)
                      ? "Save changes"
                      : "Publish"}
                </Button>
              </SplitButton>

              <Button type="button" variant="outline" onClick={closePanel} disabled={saving}>
                Cancel
              </Button>
            </div>
          )
        }
      >
        {panel.mode !== "closed" ? (
          <form
            id={PANEL_FORM_ID}
            onSubmit={submitPanel}
            encType="multipart/form-data"
            // A question is on screen while the confirm is up, so Enter is not
            // an answer to it: it neither posts nor quietly saves instead.
            onKeyDown={(event) => {
              if (
                pendingPanelPost &&
                event.key === "Enter" &&
                (event.target as HTMLElement).tagName !== "TEXTAREA"
              ) {
                event.preventDefault()
              }
            }}
          >
            {/* Keeps Enter-in-a-field working now that every real save button
                sits in the footer, outside the form: this is a default button
                the form owns outright. Hidden, so the panel's focus trap steps
                over it, and first in tree order, so Enter always means the
                primary action — never the post-to-Facebook confirm, which is
                otherwise the only submit button on screen. */}
            <button type="submit" data-panel-action="publish" hidden aria-hidden="true" />

            <AdminPackageFormFields
              key={panel.mode === "edit" ? panel.pkg.id : "create"}
              pkg={panel.mode === "edit" ? panel.pkg : null}
              disabled={saving}
            />

            {panelError ? (
              <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                {panelError}
              </p>
            ) : null}
          </form>
        ) : null}
      </AdminSidePanel>
    </section>
  )
}
