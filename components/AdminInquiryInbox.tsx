"use client"

import { Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"

import AdminListSkeleton from "@/components/AdminListSkeleton"
import AdminSidePanel from "@/components/AdminSidePanel"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminPackageRecord } from "@/lib/admin-package-types"
import {
  INQUIRY_STATUSES,
  type InquiryRecord,
  type InquirySource,
  type InquiryStatus
} from "@/lib/inquiry-types"
import { buildPackageHref, derivePackageSlug } from "@/lib/package-slug"
import { formatDuration, formatPackagePrice } from "@/lib/price"
import { cn } from "@/lib/utils"

const statusLabels: Record<InquiryStatus, string> = {
  new: "New",
  read: "Read",
  responded: "Responded",
  archived: "Archived"
}

/** Which channel produced the lead — the chat assistant is one of three. */
const sourceLabels: Record<InquirySource, string> = {
  "contact-form": "Contact form",
  "package-cta": "Package page",
  "chat-agent": "AI assistant"
}

const statusStyles: Record<InquiryStatus, string> = {
  new: "bg-amber-100 text-amber-900",
  read: "bg-sky-100 text-sky-900",
  responded: "bg-emerald-100 text-emerald-900",
  archived: "bg-muted text-muted-foreground"
}

function formatDateTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
}

function formatDay(iso?: string) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-PH", { dateStyle: "medium" })
}

function travelWindow(inquiry: InquiryRecord) {
  const from = formatDay(inquiry.travelDateFrom)
  const to = formatDay(inquiry.travelDateTo)
  if (from && to) return `${from} → ${to}`
  return from ?? to ?? null
}

function partySize(inquiry: InquiryRecord) {
  if (inquiry.adults === undefined && inquiry.children === undefined) return null
  const parts = [`${inquiry.adults ?? 0} adult${inquiry.adults === 1 ? "" : "s"}`]
  if (inquiry.children) parts.push(`${inquiry.children} child${inquiry.children === 1 ? "" : "ren"}`)
  return parts.join(", ")
}

function buildReplyHref(inquiry: InquiryRecord) {
  const subject = inquiry.packageTitle
    ? `Re: your inquiry about ${inquiry.packageTitle}`
    : "Re: your travel inquiry"
  const body = `Hi ${inquiry.name},\n\nThank you for your booking request with Noah's Way Travel & Tours.\n\n`
  return `mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

export default function AdminInquiryInbox() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([])
  const [packages, setPackages] = useState<AdminPackageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all")
  const [packageFilter, setPackageFilter] = useState<string>("all")

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)

  const loadInquiries = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/admin/inquiries", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as {
        inquiries?: InquiryRecord[]
        packages?: AdminPackageRecord[]
      } | null

      if (!response.ok || !payload) {
        setLoadError(getApiErrorMessage(payload) ?? "Could not load inquiries.")
        return
      }

      setInquiries(payload.inquiries ?? [])
      setPackages(payload.packages ?? [])
    } catch {
      setLoadError("Network error loading inquiries.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInquiries()
  }, [loadInquiries])

  const selected = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedId) ?? null,
    [inquiries, selectedId]
  )

  const selectedPackage = useMemo(
    () => (selected?.packageId ? packages.find((pkg) => pkg.id === selected.packageId) : null),
    [selected, packages]
  )

  const counts = useMemo(
    () =>
      inquiries.reduce<Record<string, number>>((acc, inquiry) => {
        acc[inquiry.status] = (acc[inquiry.status] ?? 0) + 1
        return acc
      }, {}),
    [inquiries]
  )

  const referencedPackages = useMemo(() => {
    const ids = new Set(inquiries.map((i) => i.packageId).filter(Boolean) as string[])
    return packages.filter((pkg) => ids.has(pkg.id))
  }, [inquiries, packages])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return inquiries.filter((inquiry) => {
      if (statusFilter !== "all" && inquiry.status !== statusFilter) return false
      if (packageFilter === "none" && inquiry.packageId) return false
      if (packageFilter !== "all" && packageFilter !== "none" && inquiry.packageId !== packageFilter)
        return false
      if (!needle) return true
      return `${inquiry.name} ${inquiry.email} ${inquiry.mobile} ${inquiry.destination ?? ""} ${
        inquiry.message ?? ""
      } ${inquiry.packageTitle ?? ""}`
        .toLowerCase()
        .includes(needle)
    })
  }, [inquiries, statusFilter, packageFilter, query])

  function openInquiry(inquiry: InquiryRecord) {
    setSelectedId(inquiry.id)
    setNoteDraft(inquiry.adminNote ?? "")
    setPanelError(null)
    // Opening a new inquiry marks it read, so the "New" count means untouched.
    if (inquiry.status === "new") void patchInquiry(inquiry.id, { status: "read" })
  }

  async function patchInquiry(id: string, updates: { status?: InquiryStatus; adminNote?: string }) {
    setBusy(true)
    setPanelError(null)
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })
      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setPanelError(getApiErrorMessage(payload) ?? "Could not update the inquiry.")
        return
      }

      setInquiries((current) =>
        current.map((item) => (item.id === id ? { ...item, ...updates } : item))
      )
    } catch {
      setPanelError("Network error while updating.")
    } finally {
      setBusy(false)
    }
  }

  async function removeInquiry(id: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/inquiries/${id}`, { method: "DELETE" })
      if (!response.ok) {
        setPanelError("Could not delete the inquiry.")
        return
      }
      setInquiries((current) => current.filter((item) => item.id !== id))
      setSelectedId(null)
    } catch {
      setPanelError("Network error while deleting.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <AdminListSkeleton rows={4} />

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">{loadError}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={loadInquiries}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 basis-56 space-y-1.5">
          <label htmlFor="inquiry-search" className="text-sm font-medium">
            Search
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="inquiry-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, message…"
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="inquiry-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="inquiry-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as InquiryStatus | "all")}
            className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All ({inquiries.length})</option>
            {INQUIRY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]} ({counts[status] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="inquiry-package" className="text-sm font-medium">
            Package
          </label>
          <select
            id="inquiry-package"
            value={packageFilter}
            onChange={(event) => setPackageFilter(event.target.value)}
            className="flex h-10 max-w-56 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="none">General enquiries</option>
            {referencedPackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        Showing {visible.length} of {inquiries.length}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No inquiries match those filters.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {visible.map((inquiry, index) => {
            const window = travelWindow(inquiry)
            return (
              <li
                key={inquiry.id}
                style={{ "--row-index": index } as CSSProperties}
                className="admin-row-in"
              >
                <button
                  type="button"
                  onClick={() => openInquiry(inquiry)}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors duration-200 hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{inquiry.name}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-300",
                          statusStyles[inquiry.status]
                        )}
                      >
                        {statusLabels[inquiry.status]}
                      </span>
                      {inquiry.packageTitle ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {inquiry.packageTitle}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {inquiry.destination
                        ? `${inquiry.destination}${inquiry.airportOfOrigin ? ` from ${inquiry.airportOfOrigin}` : ""}`
                        : (inquiry.message ?? "No destination given")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(inquiry.createdAt)}
                      {window ? ` · ${window}` : ""}
                      {partySize(inquiry) ? ` · ${partySize(inquiry)}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">View</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <AdminSidePanel
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? "Inquiry"}
        description={selected ? formatDateTime(selected.createdAt) : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              <a href={buildReplyHref(selected)} className={cn(buttonVariants({ size: "sm" }))}>
                Reply by email
              </a>
              {selected.status !== "responded" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => patchInquiry(selected.id, { status: "responded" })}
                >
                  Mark responded
                </Button>
              ) : null}
              {selected.status !== "archived" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => patchInquiry(selected.id, { status: "archived" })}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() => removeInquiry(selected.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-6">
            {panelError ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {panelError}
              </p>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Contact
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Mobile</dt>
                  <dd>
                    <a href={`tel:${selected.mobile.replace(/[^\d+]/g, "")}`} className="text-primary underline">
                      {selected.mobile}
                    </a>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Email</dt>
                  <dd className="break-all">
                    <a href={`mailto:${selected.email}`} className="text-primary underline">
                      {selected.email}
                    </a>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Status</dt>
                  <dd>{statusLabels[selected.status]}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Came from</dt>
                  <dd>{sourceLabels[selected.source] ?? selected.source}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Trip details
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Destination</dt>
                  <dd>{selected.destination ?? "Not given"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">From airport</dt>
                  <dd>{selected.airportOfOrigin ?? "Not given"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Travel dates</dt>
                  <dd>
                    {travelWindow(selected) ?? "Not given"}
                    {selected.flexibleOnPromoDates ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                        Flexible for promos
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Travellers</dt>
                  <dd>{partySize(selected) ?? "Not given"}</dd>
                </div>
                {selected.childAges ? (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Child ages</dt>
                    <dd>{selected.childAges}</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">Travel type</dt>
                  <dd className="capitalize">{selected.travelType ?? "Not given"}</dd>
                </div>
              </dl>
            </section>

            {selected.message ? (
              <section className="lg:col-span-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Notes from the customer
                </h3>
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                  {selected.message}
                </p>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Package they were viewing
              </h3>
              {selectedPackage ? (
                <div className="mt-3 flex gap-4 rounded-xl border border-border p-3">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={selectedPackage.previewImage}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-foreground">{selectedPackage.title}</p>
                    <p className="mt-1 text-muted-foreground">
                      {formatPackagePrice(selectedPackage)}
                      {formatDuration(
                        selectedPackage.durationDays,
                        selectedPackage.durationNights
                      )
                        ? ` · ${formatDuration(selectedPackage.durationDays, selectedPackage.durationNights)}`
                        : ""}
                    </p>
                    {selectedPackage.destination ? (
                      <p className="text-muted-foreground">{selectedPackage.destination}</p>
                    ) : null}
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {selectedPackage.category}
                      {selectedPackage.status === "draft" ? " · draft" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <Link
                        href={buildPackageHref(
                          selectedPackage.category,
                          derivePackageSlug(selectedPackage)
                        )}
                        target="_blank"
                        className="text-primary underline"
                      >
                        View public page
                      </Link>
                      <Link href="/admin/packages" className="text-primary underline">
                        Edit package
                      </Link>
                    </div>
                  </div>
                </div>
              ) : selected.packageTitle ? (
                <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  “{selected.packageTitle}” — this package has since been deleted.
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  General enquiry — not tied to a package.
                </p>
              )}
            </section>

            <section>
              <label
                htmlFor="admin-note"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Internal note
              </label>
              <Textarea
                id="admin-note"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                className="mt-3"
                placeholder="Quoted 2 adults, waiting on hotel confirmation…"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={busy || noteDraft === (selected.adminNote ?? "")}
                onClick={() => patchInquiry(selected.id, { adminNote: noteDraft })}
              >
                {busy ? "Saving…" : "Save note"}
              </Button>
            </section>
            </div>
          </div>
        ) : null}
      </AdminSidePanel>
    </section>
  )
}
