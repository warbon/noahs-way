"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useCallback, useEffect, useRef, useState } from "react"

import AdminAvailabilityEditor from "@/components/AdminAvailabilityEditor"
import AdminListSkeleton from "@/components/AdminListSkeleton"
import AdminSidePanel from "@/components/AdminSidePanel"
import AdminStayFormFields from "@/components/AdminStayFormFields"
import { Button } from "@/components/ui/button"
import type { AdminStayRecord } from "@/lib/admin-stay-types"
import { formatPricePHP } from "@/lib/price"
import { normalizeBlocks, todayInManila } from "@/lib/stay-availability"
import { deriveSlug } from "@/lib/slug"

type StatusFilter = "all" | "published" | "draft"

type PanelState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; stay: AdminStayRecord }
  | { mode: "availability"; stay: AdminStayRecord }

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string }

const PANEL_FORM_ID = "admin-stay-form"

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

function isDraft(stay: AdminStayRecord) {
  // Absent status means published, matching the public site's own rule.
  return stay.status === "draft"
}

/**
 * Upcoming blocked nights only.
 *
 * A unit blocked solid last March is free today, and counting expired ranges
 * would show "blocked" against a listing that is wide open — the number has to
 * mean what the guest's calendar means.
 */
function upcomingBlockCount(stay: AdminStayRecord) {
  const today = todayInManila()
  return normalizeBlocks(stay.blocks).filter((block) => block.to > today).length
}

function sortByNewestFirst(stays: AdminStayRecord[]) {
  return [...stays].sort((a, b) => {
    // Records seeded before `createdAt` existed sort below those that carry
    // one, rather than being given a made-up date.
    if (!a.createdAt && !b.createdAt) return 0
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export default function AdminStayManagerPanel() {
  const [stays, setStays] = useState<AdminStayRecord[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [panel, setPanel] = useState<PanelState>({ mode: "closed" })
  const [save, setSave] = useState<SaveState>({ status: "idle" })
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stays", { cache: "no-store" })
      if (!response.ok) {
        setLoadError("Could not load the stay list.")
        return
      }
      const payload = (await response.json()) as { stays?: AdminStayRecord[] }
      setStays(Array.isArray(payload.stays) ? payload.stays : [])
      setLoadError(null)
    } catch {
      setLoadError("Could not reach the server.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * `?edit=<id>` and `?dates=<id>` open that unit's panel once the list has
   * loaded; the preview page's buttons land here. The parameter is dropped at
   * once, so a refresh does not reopen the panel over whatever came next.
   */
  const handledParamRef = useRef(false)
  useEffect(() => {
    if (stays === null || handledParamRef.current) return

    const params = new URLSearchParams(window.location.search)
    const editId = params.get("edit")
    const datesId = params.get("dates")
    if (!editId && !datesId) return
    handledParamRef.current = true

    const match = stays.find((stay) => stay.id === (editId ?? datesId))
    if (match) {
      setPanel({ mode: editId ? "edit" : "availability", stay: match })
    } else {
      setLoadError("That unit could not be found — it may have been deleted.")
    }

    window.history.replaceState(null, "", window.location.pathname)
  }, [stays])

  const visible = sortByNewestFirst(
    (stays ?? []).filter((stay) => {
      if (statusFilter === "all") return true
      return statusFilter === "draft" ? isDraft(stay) : !isDraft(stay)
    })
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (panel.mode !== "create" && panel.mode !== "edit") return

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const status = submitter?.value === "publish" ? "published" : "draft"

    const formData = new FormData(event.currentTarget)
    formData.set("status", status)

    setSave({ status: "saving" })

    const isEdit = panel.mode === "edit"
    const url = isEdit ? `/api/admin/stays/${panel.stay.id}` : "/api/admin/stays"

    try {
      const response = await fetch(url, { method: isEdit ? "PATCH" : "POST", body: formData })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setSave({
          status: "error",
          message: getApiErrorMessage(payload) ?? "The unit could not be saved."
        })
        return
      }

      setSave({ status: "idle" })
      setPanel({ mode: "closed" })
      await load()
    } catch {
      setSave({ status: "error", message: "Could not reach the server." })
    }
  }

  async function onDelete(stay: AdminStayRecord) {
    // Deleting takes the photo with it and cannot be undone, so it asks.
    if (!window.confirm(`Delete "${stay.title}"? This also removes its photo and cannot be undone.`)) {
      return
    }

    setDeletingId(stay.id)
    try {
      const response = await fetch(`/api/admin/stays/${stay.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setLoadError(getApiErrorMessage(payload) ?? "The unit could not be deleted.")
        return
      }
      await load()
    } catch {
      setLoadError("Could not reach the server.")
    } finally {
      setDeletingId(null)
    }
  }

  const editing = panel.mode === "edit" ? panel.stay : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "published", "draft"] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              aria-pressed={statusFilter === filter}
              className={
                statusFilter === filter
                  ? "rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  : "rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              }
            >
              {filter === "all" ? "All" : filter === "published" ? "Published" : "Drafts"}
            </button>
          ))}
        </div>

        <Button type="button" onClick={() => setPanel({ mode: "create" })}>
          Add a unit
        </Button>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {stays === null ? (
        <AdminListSkeleton withThumbnail />
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {stays.length === 0
            ? "No condo units yet. Add one to get the Stays section live."
            : "No units match this filter."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((stay) => {
            const blocked = upcomingBlockCount(stay)
            const slug = deriveSlug(stay, "stay")

            return (
              <li key={stay.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={stay.previewImage}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{stay.title}</p>
                    {isDraft(stay) ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Draft
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stay.city} · {formatPricePHP(stay.nightlyRate, stay.currency ?? "PHP")}/night ·
                    sleeps {stay.maxGuests}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {blocked === 0
                      ? "No upcoming blocked dates"
                      : `${blocked} upcoming blocked range${blocked === 1 ? "" : "s"}`}
                    {stay.availabilityUpdatedAt
                      ? ` · updated ${stay.availabilityUpdatedAt.slice(0, 10)}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPanel({ mode: "availability", stay })}
                  >
                    Dates
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPanel({ mode: "edit", stay })}>
                    Edit
                  </Button>
                  {/*
                    Preview rather than the live page: it works for drafts too,
                    which is the case that actually needs looking at, and it
                    carries the publish decision with it.
                  */}
                  <Link
                    href={`/admin/stays/${stay.id}/preview`}
                    className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
                  >
                    Preview
                  </Link>
                  {!isDraft(stay) ? (
                    <Link
                      href={`/stays/${slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted"
                    >
                      View
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deletingId === stay.id}
                    onClick={() => onDelete(stay)}
                  >
                    {deletingId === stay.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AdminSidePanel
        open={panel.mode === "create" || panel.mode === "edit"}
        title={panel.mode === "edit" ? "Edit unit" : "Add a unit"}
        description={
          panel.mode === "edit"
            ? "Changes go live as soon as you publish."
            : "Save as a draft first if you still need photos or a price."
        }
        onClose={() => {
          setPanel({ mode: "closed" })
          setSave({ status: "idle" })
        }}
        footer={
          <div className="space-y-3">
            {save.status === "error" ? (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {save.message}
              </p>
            ) : null}
            <div className="flex gap-3">
              <Button
                type="submit"
                form={PANEL_FORM_ID}
                name="intent"
                value="draft"
                variant="outline"
                disabled={save.status === "saving"}
                className="flex-1"
              >
                Save as draft
              </Button>
              <Button
                type="submit"
                form={PANEL_FORM_ID}
                name="intent"
                value="publish"
                disabled={save.status === "saving"}
                className="flex-1"
              >
                {save.status === "saving" ? "Saving…" : "Publish"}
              </Button>
            </div>
          </div>
        }
      >
        {/*
          Keyed on the record so switching between units remounts the form.
          React reuses uncontrolled inputs across renders otherwise, and the
          previous unit's rate would stay in the field above a different title.
        */}
        <form
          key={editing?.id ?? "new"}
          id={PANEL_FORM_ID}
          onSubmit={onSubmit}
          encType="multipart/form-data"
        >
          <fieldset disabled={save.status === "saving"} className="border-0 p-0">
            <AdminStayFormFields editing={editing} />
          </fieldset>
        </form>
      </AdminSidePanel>

      <AdminSidePanel
        open={panel.mode === "availability"}
        title="Availability"
        description="Block the nights this unit is taken. Guests see this on the unit's page."
        onClose={() => setPanel({ mode: "closed" })}
      >
        {panel.mode === "availability" ? (
          <AdminAvailabilityEditor
            stayId={panel.stay.id}
            stayTitle={panel.stay.title}
            blocks={panel.stay.blocks ?? []}
            onSaved={(blocks, updatedAt) => {
              setStays((current) =>
                (current ?? []).map((stay) =>
                  stay.id === panel.stay.id
                    ? { ...stay, blocks, availabilityUpdatedAt: updatedAt }
                    : stay
                )
              )
            }}
          />
        ) : null}
      </AdminSidePanel>
    </div>
  )
}
