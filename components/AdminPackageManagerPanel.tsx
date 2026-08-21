"use client"

import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent
} from "react"

import AdminListSkeleton from "@/components/AdminListSkeleton"
import AdminPackageFormFields from "@/components/AdminPackageFormFields"
import AdminSidePanel from "@/components/AdminSidePanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminPackageCatalog, AdminPackageRecord } from "@/lib/admin-package-types"
import type { PackageCategory } from "@/lib/package-data"
import { formatPackagePrice } from "@/lib/price"

type CategoryFilter = "all" | PackageCategory
type StatusFilter = "all" | "published" | "draft"

type PanelState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; pkg: AdminPackageRecord }

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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

  const allPackages = useMemo(
    () => [...catalog.local, ...catalog.international],
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

  function closePanel() {
    setPanel({ mode: "closed" })
    setPanelError(null)
  }

  async function submitPanel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (panel.mode === "closed") return

    const formData = new FormData(event.currentTarget)
    const isEdit = panel.mode === "edit"

    // An untouched file input still submits an empty File; sending it would
    // fail the create route's size check and pointlessly replace nothing on edit.
    const image = formData.get("image")
    if (image instanceof File && image.size === 0) formData.delete("image")

    setSaving(true)
    setPanelError(null)

    try {
      const response = await fetch(
        isEdit ? `/api/admin/packages/${panel.pkg.id}` : "/api/admin/packages",
        { method: isEdit ? "PUT" : "POST", body: formData }
      )
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setPanelError(getApiErrorMessage(payload) ?? "Could not save the package.")
        return
      }

      await loadPackages()
      setNotice(isEdit ? "Package updated." : "Package created.")
      closePanel()
      startTransition(() => router.refresh())
    } catch {
      setPanelError("Network error while saving.")
    } finally {
      setSaving(false)
    }
  }

  async function deletePackage(pkg: AdminPackageRecord) {
    setBusyId(pkg.id)
    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown
        setNotice(getApiErrorMessage(payload) ?? "Could not delete the package.")
        return
      }

      setCatalog((prev) => ({
        local: prev.local.filter((item) => item.id !== pkg.id),
        international: prev.international.filter((item) => item.id !== pkg.id)
      }))
      setNotice(`Deleted “${pkg.title}”.`)
      startTransition(() => router.refresh())
    } catch {
      setNotice("Network error while deleting.")
    } finally {
      setBusyId(null)
      setPendingDeleteId(null)
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
          className="notice-in rounded-md bg-muted px-3 py-2 text-sm text-foreground"
        >
          {notice}
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
                    ) : (
                      <>
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
            ? panel.pkg.title
            : "Fields beyond the basics are optional, but they are what make the package readable on phones and findable on Google."
        }
      >
        {panel.mode !== "closed" ? (
          <form id="admin-package-form" onSubmit={submitPanel} encType="multipart/form-data">
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

            <div className="mt-6 flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : panel.mode === "edit"
                    ? "Save changes"
                    : "Create package"}
              </Button>
              <Button type="button" variant="outline" onClick={closePanel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </AdminSidePanel>
    </section>
  )
}
