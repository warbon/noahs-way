"use client"

import { startTransition, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import AdminPackageUploadForm from "@/components/AdminPackageUploadForm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PackageCategory } from "@/lib/package-data"

type PackageRecord = {
  id: string
  category: PackageCategory
  title: string
  details: string
  previewImage: string
  imagePath: string
  price: string
}

type PackageCatalogResponse = {
  packages: Record<PackageCategory, PackageRecord[]>
}

type EditablePackage = PackageRecord

type ActionState = {
  type: "idle" | "saving" | "deleting"
  message?: string
  error?: string
}

function emptyActionState(): ActionState {
  return { type: "idle" }
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

function normalizeResponsePayload(payload: unknown): PackageCatalogResponse | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  if (!record.packages || typeof record.packages !== "object") return null

  const packagesRecord = record.packages as Record<string, unknown>
  if (!Array.isArray(packagesRecord.local) || !Array.isArray(packagesRecord.international)) return null

  return {
    packages: {
      local: packagesRecord.local as PackageRecord[],
      international: packagesRecord.international as PackageRecord[]
    }
  }
}

export default function AdminPackageManagerPanel() {
  const router = useRouter()
  const [packages, setPackages] = useState<Record<PackageCategory, EditablePackage[]>>({
    local: [],
    international: []
  })
  const [previewPackage, setPreviewPackage] = useState<EditablePackage | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionStateById, setActionStateById] = useState<Record<string, ActionState>>({})
  const [editImageFileById, setEditImageFileById] = useState<Record<string, File | null>>({})

  const setActionState = (id: string, next: ActionState) => {
    setActionStateById((prev) => ({
      ...prev,
      [id]: next
    }))
  }

  const clearActionState = (id: string) => {
    setActionStateById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const replacePackageInState = (updated: EditablePackage) => {
    setPackages((prev) => {
      const next = {
        local: prev.local.filter((pkg) => pkg.id !== updated.id),
        international: prev.international.filter((pkg) => pkg.id !== updated.id)
      }

      next[updated.category] = [updated, ...next[updated.category]]
      return next
    })
  }

  async function loadPackages() {
    setLoading(true)
    setLoadError(null)

    try {
      const response = await fetch("/api/admin/packages", {
        method: "GET",
        cache: "no-store"
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setLoadError(getApiErrorMessage(payload) ?? "Failed to load packages.")
        return
      }

      const normalized = normalizeResponsePayload(payload)
      if (!normalized) {
        setLoadError("Unexpected API response while loading packages.")
        return
      }

      setPackages(normalized.packages)
    } catch {
      setLoadError("Network error while loading packages.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPackages()
  }, [])

  async function savePackage(pkg: EditablePackage) {
    setActionState(pkg.id, { type: "saving" })

    try {
      const formData = new FormData()
      formData.set("category", pkg.category)
      formData.set("title", pkg.title)
      formData.set("details", pkg.details)
      formData.set("price", pkg.price)

      const replacementImage = editImageFileById[pkg.id]
      if (replacementImage) {
        formData.set("image", replacementImage)
      }

      const response = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PUT",
        body: formData
      })

      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setActionState(pkg.id, {
          type: "idle",
          error: getApiErrorMessage(payload) ?? "Failed to save package."
        })
        return
      }

      const updatedPackage =
        payload &&
        typeof payload === "object" &&
        "package" in payload &&
        payload.package &&
        typeof payload.package === "object"
          ? (payload.package as PackageRecord)
          : null

      if (!updatedPackage) {
        setActionState(pkg.id, { type: "idle", error: "Unexpected save response." })
        return
      }

      replacePackageInState(updatedPackage)
      setEditImageFileById((prev) => {
        const next = { ...prev }
        delete next[pkg.id]
        return next
      })
      setActionState(updatedPackage.id, { type: "idle", message: "Saved." })

      startTransition(() => {
        router.refresh()
      })
    } catch {
      setActionState(pkg.id, { type: "idle", error: "Network error while saving." })
    }
  }

  async function deletePackage(pkg: EditablePackage) {
    setActionState(pkg.id, { type: "deleting" })

    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "DELETE"
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setActionState(pkg.id, {
          type: "idle",
          error: getApiErrorMessage(payload) ?? "Failed to delete package."
        })
        return
      }

      setPackages((prev) => ({
        local: prev.local.filter((item) => item.id !== pkg.id),
        international: prev.international.filter((item) => item.id !== pkg.id)
      }))
      setExpandedId((prev) => (prev === pkg.id ? null : prev))
      setConfirmDeleteId((prev) => (prev === pkg.id ? null : prev))
      setEditImageFileById((prev) => {
        const next = { ...prev }
        delete next[pkg.id]
        return next
      })
      clearActionState(pkg.id)

      startTransition(() => {
        router.refresh()
      })
    } catch {
      setActionState(pkg.id, { type: "idle", error: "Network error while deleting." })
    }
  }

  const totalCount = packages.local.length + packages.international.length

  const zoomInPreview = () => {
    setPreviewZoom((prev) => Math.min(prev + 0.2, 3))
  }

  const zoomOutPreview = () => {
    setPreviewZoom((prev) => Math.max(prev - 0.2, 1))
  }

  const resetPreviewZoom = () => {
    setPreviewZoom(1)
  }

  return (
    <div className="space-y-8">
      <AdminPackageUploadForm
        onUploaded={() => {
          void loadPackages()
        }}
      />

      <section className="rounded-2xl border border-primary/15 bg-white p-6 shadow-xl shadow-primary/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-primary">Manage Packages</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View, edit, and delete saved package records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{totalCount} total</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void loadPackages()
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </p>
        ) : null}

        <div className="mt-6 space-y-6">
          {(["local", "international"] as const).map((category) => {
            const categoryPackages = packages[category]

            return (
              <div key={category}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">
                    {category === "local" ? "Local" : "International"}
                  </h3>
                  <span className="text-xs text-muted-foreground">{categoryPackages.length} items</span>
                </div>

                {categoryPackages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-primary/15 bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                    No packages in this category yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryPackages.map((pkg) => {
                      const isExpanded = expandedId === pkg.id
                      const actionState = actionStateById[pkg.id] ?? emptyActionState()
                      const isSaving = actionState.type === "saving"
                      const isDeleting = actionState.type === "deleting"
                      const disabled = isSaving || isDeleting

                      return (
                        <article
                          key={pkg.id}
                          className="overflow-hidden rounded-xl border border-primary/10 bg-background"
                        >
                          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                            <div className="relative h-28 w-full overflow-hidden rounded-lg bg-muted md:w-40">
                              <Image
                                src={pkg.previewImage || pkg.imagePath}
                                alt={pkg.title}
                                fill
                                className="object-cover"
                                sizes="160px"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-base font-semibold text-foreground">
                                    {pkg.title}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">{pkg.price}</p>
                                  <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
                                    {pkg.details}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex h-9 items-center rounded-md border border-primary/15 bg-white px-3 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
                                    onClick={() => {
                                      setPreviewZoom(1)
                                      setPreviewPackage(pkg)
                                    }}
                                  >
                                    View Image
                                  </button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setExpandedId((prev) => (prev === pkg.id ? null : pkg.id))
                                    }
                                  >
                                    {isExpanded ? "Close" : "Edit"}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setConfirmDeleteId((prev) => (prev === pkg.id ? null : pkg.id))
                                    }}
                                    disabled={disabled}
                                  >
                                    {confirmDeleteId === pkg.id ? "Cancel Delete" : "Delete"}
                                  </Button>
                                </div>
                              </div>

                              {actionState.error ? (
                                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                  {actionState.error}
                                </p>
                              ) : null}

                              {actionState.message ? (
                                <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                  {actionState.message}
                                </p>
                              ) : null}

                              {confirmDeleteId === pkg.id ? (
                                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-3">
                                  <p className="text-sm text-red-700">
                                    Delete <span className="font-semibold">{pkg.title}</span>? This removes the
                                    package from the catalog (image file stays on disk).
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        void deletePackage(pkg)
                                      }}
                                      disabled={disabled}
                                    >
                                      {isDeleting ? "Deleting..." : "Confirm Delete"}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setConfirmDeleteId(null)
                                      }}
                                      disabled={disabled}
                                    >
                                      Keep Package
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="border-t border-primary/10 bg-white p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <label
                                    htmlFor={`category-${pkg.id}`}
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Category
                                  </label>
                                  <select
                                    id={`category-${pkg.id}`}
                                    value={pkg.category}
                                    disabled={disabled}
                                    onChange={(event) => {
                                      const nextCategory = event.target.value as PackageCategory
                                      setPackages((prev) => ({
                                        local: prev.local.map((item) =>
                                          item.id === pkg.id ? { ...item, category: nextCategory } : item
                                        ),
                                        international: prev.international.map((item) =>
                                          item.id === pkg.id ? { ...item, category: nextCategory } : item
                                        )
                                      }))
                                    }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="local">Local</option>
                                    <option value="international">International</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label
                                    htmlFor={`price-${pkg.id}`}
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Price
                                  </label>
                                  <Input
                                    id={`price-${pkg.id}`}
                                    value={pkg.price}
                                    disabled={disabled}
                                    onChange={(event) => {
                                      const nextValue = event.target.value
                                      setPackages((prev) => ({
                                        local: prev.local.map((item) =>
                                          item.id === pkg.id ? { ...item, price: nextValue } : item
                                        ),
                                        international: prev.international.map((item) =>
                                          item.id === pkg.id ? { ...item, price: nextValue } : item
                                        )
                                      }))
                                    }}
                                  />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <label
                                    htmlFor={`title-${pkg.id}`}
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Title
                                  </label>
                                  <Input
                                    id={`title-${pkg.id}`}
                                    value={pkg.title}
                                    disabled={disabled}
                                    onChange={(event) => {
                                      const nextValue = event.target.value
                                      setPackages((prev) => ({
                                        local: prev.local.map((item) =>
                                          item.id === pkg.id ? { ...item, title: nextValue } : item
                                        ),
                                        international: prev.international.map((item) =>
                                          item.id === pkg.id ? { ...item, title: nextValue } : item
                                        )
                                      }))
                                    }}
                                  />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <label
                                    htmlFor={`details-${pkg.id}`}
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Details
                                  </label>
                                  <Textarea
                                    id={`details-${pkg.id}`}
                                    value={pkg.details}
                                    disabled={disabled}
                                    onChange={(event) => {
                                      const nextValue = event.target.value
                                      setPackages((prev) => ({
                                        local: prev.local.map((item) =>
                                          item.id === pkg.id ? { ...item, details: nextValue } : item
                                        ),
                                        international: prev.international.map((item) =>
                                          item.id === pkg.id ? { ...item, details: nextValue } : item
                                        )
                                      }))
                                    }}
                                  />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <label
                                    htmlFor={`image-${pkg.id}`}
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Replace image (optional)
                                  </label>
                                  <Input
                                    id={`image-${pkg.id}`}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={disabled}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0] ?? null
                                      setEditImageFileById((prev) => ({
                                        ...prev,
                                        [pkg.id]: file
                                      }))
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {editImageFileById[pkg.id]
                                      ? `Selected: ${editImageFileById[pkg.id]?.name}`
                                      : "Leave empty to keep the current image."}
                                  </p>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-medium text-foreground">
                                    Image path
                                  </label>
                                  <Input value={pkg.imagePath} disabled readOnly />
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  onClick={() => {
                                    void savePackage(pkg)
                                  }}
                                  disabled={disabled}
                                >
                                  {isSaving ? "Saving..." : "Save Changes"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    void loadPackages()
                                  }}
                                  disabled={disabled || loading}
                                >
                                  Reset
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {previewPackage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewPackage(null)}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-label={`Preview image for ${previewPackage.title}`}
            className="w-full max-w-[96vw] rounded-3xl bg-white p-5 shadow-2xl md:max-w-5xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-primary md:text-2xl">{previewPackage.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{previewPackage.price}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={zoomOutPreview}
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={zoomInPreview}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  className="rounded-full border border-primary/20 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/5"
                  onClick={resetPreviewZoom}
                >
                  {Math.round(previewZoom * 100)}%
                </button>
                <Button type="button" variant="outline" onClick={() => setPreviewPackage(null)}>
                  Close
                </Button>
              </div>
            </div>

            <div
              className="h-[70vh] w-full overflow-auto rounded-2xl bg-muted/30"
              onWheel={(event) => {
                if (!(event.ctrlKey || event.metaKey)) return

                event.preventDefault()
                if (event.deltaY < 0) zoomInPreview()
                if (event.deltaY > 0) zoomOutPreview()
              }}
            >
              <div
                className="relative min-h-full min-w-full"
                style={{
                  width: `${previewZoom * 100}%`,
                  height: `${previewZoom * 100}%`,
                  transition: "width 160ms ease-out, height 160ms ease-out"
                }}
              >
                <Image
                  src={previewPackage.imagePath}
                  alt={`${previewPackage.title} package image`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 80vw"
                />
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  )
}
