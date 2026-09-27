"use client"

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  Search,
  TrendingUp,
  Users
} from "lucide-react"
import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode
} from "react"

import {
  acceptPackageAction,
  acceptStayAction,
  changeStatusAction,
  recordPaymentAction,
  updateQuoteAction
} from "@/app/admin/dashboard/actions"
import AdminSidePanel from "@/components/AdminSidePanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActivityEvent } from "@/lib/activity-types"
import {
  bookingPaymentTotals,
  getBookingEndDate,
  getBookingPayments,
  getBookingProductType,
  getBookingStartDate,
  getBookingTitle,
  type BookingPaymentMethod,
  type BookingRecord
} from "@/lib/booking-types"
import type { BookingDashboardData, CurrencyMetric } from "@/lib/dashboard-types"
import type { InquiryRecord } from "@/lib/inquiry-types"
import { cn } from "@/lib/utils"

type PipelineItem =
  | { kind: "inquiry"; id: string; createdAt: string; inquiry: InquiryRecord }
  | { kind: "booking"; id: string; createdAt: string; booking: BookingRecord }

const statusStyle: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  read: "bg-sky-100 text-sky-900",
  responded: "bg-indigo-100 text-indigo-900",
  accepted: "bg-emerald-100 text-emerald-900",
  declined: "bg-rose-100 text-rose-900",
  archived: "bg-muted text-muted-foreground",
  held: "bg-amber-100 text-amber-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  completed: "bg-sky-100 text-sky-900",
  cancelled: "bg-rose-100 text-rose-900"
}

function formatMoney(amount: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
}

function metricMoney(metrics: CurrencyMetric[]) {
  if (!metrics.length) return "₱0"
  return metrics.map((metric) => formatMoney(metric.amount, metric.currency)).join(" · ")
}

function currencyTotals(entries: Array<{ currency: string; amount: number }>) {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amount)
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount })).sort((a, b) =>
    a.currency.localeCompare(b.currency)
  )
}

function compactDate(value: string) {
  const date = new Date(`${value}T00:00:00+08:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" })
}

function todayInManilaClient(now: string) {
  return new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })
}

function inquiryProduct(inquiry: InquiryRecord) {
  if (inquiry.stayId) return { type: "stay" as const, title: inquiry.stayTitle ?? "Condo stay" }
  if (inquiry.packageId) return { type: "package" as const, title: inquiry.packageTitle ?? "Travel package" }
  return { type: "general" as const, title: inquiry.destination ?? "General inquiry" }
}

function itemFields(item: PipelineItem) {
  if (item.kind === "booking") {
    return {
      customer: item.booking.guestName,
      productType: getBookingProductType(item.booking),
      title: getBookingTitle(item.booking),
      status: item.booking.status,
      paymentStatus: item.booking.paymentStatus,
      start: getBookingStartDate(item.booking),
      end: getBookingEndDate(item.booking),
      search: `${item.booking.guestName} ${item.booking.guestEmail} ${item.booking.guestMobile} ${getBookingTitle(item.booking)} ${item.booking.id}`.toLowerCase()
    }
  }
  const product = inquiryProduct(item.inquiry)
  return {
    customer: item.inquiry.name,
    productType: product.type,
    title: product.title,
    status: item.inquiry.status,
    paymentStatus: "",
    start: item.inquiry.checkIn ?? item.inquiry.travelDateFrom ?? "",
    end: item.inquiry.checkOut ?? item.inquiry.travelDateTo ?? "",
    search: `${item.inquiry.name} ${item.inquiry.email} ${item.inquiry.mobile} ${product.title} ${item.inquiry.destination ?? ""}`.toLowerCase()
  }
}

export default function AdminBookingDashboard({ initialData }: { initialData: BookingDashboardData }) {
  const [data, setData] = useState(initialData)
  const [activities, setActivities] = useState(initialData.activities)
  const [nextActivityOffset, setNextActivityOffset] = useState(initialData.nextActivityOffset)
  const [bookingActivity, setBookingActivity] = useState<Record<string, ActivityEvent[]>>({})
  const [activityLoading, setActivityLoading] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [recordFilter, setRecordFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [panelNotice, setPanelNotice] = useState<string | null>(null)
  const [confirmingStay, setConfirmingStay] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as BookingDashboardData | null
      if (response.ok && payload) {
        setData(payload)
        setActivities(payload.activities)
        setNextActivityOffset(payload.nextActivityOffset)
      }
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => void loadData(), 30_000)
    return () => window.clearInterval(timer)
  }, [loadData])

  const pipeline = useMemo<PipelineItem[]>(() => {
    const acceptedIds = new Set(data.bookings.map((booking) => booking.inquiryId))
    return [
      ...data.bookings.map((booking) => ({ kind: "booking" as const, id: booking.id, createdAt: booking.createdAt, booking })),
      ...data.inquiries
        .filter((inquiry) => !acceptedIds.has(inquiry.id))
        .map((inquiry) => ({ kind: "inquiry" as const, id: inquiry.id, createdAt: inquiry.createdAt, inquiry }))
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data.bookings, data.inquiries])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return pipeline.filter((item) => {
      const fields = itemFields(item)
      if (recordFilter !== "all" && item.kind !== recordFilter) return false
      if (productFilter !== "all" && fields.productType !== productFilter) return false
      if (statusFilter !== "all" && fields.status !== statusFilter) return false
      if (paymentFilter !== "all" && fields.paymentStatus !== paymentFilter) return false
      return !needle || fields.search.includes(needle)
    })
  }, [pipeline, query, recordFilter, productFilter, statusFilter, paymentFilter])

  const selected = useMemo(
    () => pipeline.find((item) => `${item.kind}:${item.id}` === selectedKey) ?? null,
    [pipeline, selectedKey]
  )

  const ownerInsights = useMemo(() => {
    const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled")
    const grossBooked = currencyTotals(
      activeBookings.map((booking) => ({ currency: booking.currency, amount: booking.total }))
    )
    const collected = currencyTotals(
      data.bookings.flatMap((booking) =>
        getBookingPayments(booking).map((entry) => ({
          currency: entry.currency,
          amount: entry.kind === "payment" ? entry.amount : -entry.amount
        }))
      )
    )
    const overdueHolds = data.bookings.filter(
      (booking) =>
        booking.status === "held" &&
        Boolean(booking.holdExpiresAt) &&
        booking.holdExpiresAt! < data.generatedAt
    )
    const awaitingDeposit = data.bookings.filter(
      (booking) => booking.status === "held" && bookingPaymentTotals(booking).netPaid <= 0
    )
    const balancesDue = data.bookings.filter(
      (booking) => booking.status === "confirmed" && bookingPaymentTotals(booking).balance > 0
    )
    const upcoming = activeBookings
      .filter(
        (booking) =>
          (booking.status === "held" || booking.status === "confirmed") &&
          getBookingEndDate(booking) >= todayInManilaClient(data.generatedAt)
      )
      .sort((a, b) => getBookingStartDate(a).localeCompare(getBookingStartDate(b)))
      .slice(0, 6)
    const converted = new Set(data.bookings.map((booking) => booking.inquiryId)).size
    const conversionRate = data.inquiries.length
      ? Math.round((converted / data.inquiries.length) * 100)
      : 0
    const productMap = new Map<string, { count: number; totals: Array<{ currency: string; amount: number }> }>()
    for (const booking of activeBookings) {
      const title = getBookingTitle(booking)
      const current = productMap.get(title) ?? { count: 0, totals: [] }
      current.count += 1
      current.totals.push({ currency: booking.currency, amount: booking.total })
      productMap.set(title, current)
    }
    const topProducts = Array.from(productMap, ([title, value]) => ({
      title,
      count: value.count,
      total: currencyTotals(value.totals)
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)

    return {
      activeBookings,
      grossBooked,
      collected,
      overdueHolds,
      awaitingDeposit,
      balancesDue,
      upcoming,
      conversionRate,
      topProducts,
      cancelled: data.bookings.filter((booking) => booking.status === "cancelled").length
    }
  }, [data])

  useEffect(() => {
    if (!selected || selected.kind !== "booking") return
    const controller = new AbortController()
    const booking = selected.booking
    setActivityLoading(true)
    void fetch(
      `/api/admin/dashboard?bookingId=${encodeURIComponent(booking.id)}&inquiryId=${encodeURIComponent(booking.inquiryId)}`,
      { cache: "no-store", signal: controller.signal }
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { activities?: ActivityEvent[] } | null
        if (!response.ok || !payload?.activities) return
        const fallback = activities.filter(
          (event) =>
            event.bookingId === booking.id ||
            event.entityId === booking.id ||
            event.inquiryId === booking.inquiryId ||
            event.entityId === booking.inquiryId
        )
        const complete = [
          ...payload.activities,
          ...fallback.filter((event) => !payload.activities?.some((item) => item.id === event.id))
        ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        setBookingActivity((current) => ({ ...current, [booking.id]: complete }))
      })
      .finally(() => {
        if (!controller.signal.aborted) setActivityLoading(false)
      })
    return () => controller.abort()
  }, [activities, selected])

  const runAction = useCallback((operation: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setPanelError(null)
    setPanelNotice(null)
    startTransition(async () => {
      const result = await operation()
      if (!result.ok) {
        setPanelError(result.error ?? "The action could not be completed.")
        return
      }
      setPanelNotice(success)
      setConfirmingStay(false)
      await loadData()
    })
  }, [loadData])

  async function loadMoreActivity() {
    if (nextActivityOffset === null) return
    setRefreshing(true)
    try {
      const response = await fetch(`/api/admin/dashboard?activityOffset=${nextActivityOffset}`, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as BookingDashboardData | null
      if (response.ok && payload) {
        setActivities((current) => [...current, ...payload.activities.filter((event) => !current.some((item) => item.id === event.id))])
        setNextActivityOffset(payload.nextActivityOffset)
      }
    } finally {
      setRefreshing(false)
    }
  }

  function submitPackageQuote(event: FormEvent<HTMLFormElement>, inquiry: InquiryRecord) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const holdValue = String(form.get("holdExpiresAt") ?? "")
    const holdExpiresAt = holdValue ? new Date(`${holdValue}:00+08:00`).toISOString() : undefined
    runAction(
      () => acceptPackageAction({
        inquiryId: inquiry.id,
        travelDateFrom: String(form.get("travelDateFrom") ?? ""),
        travelDateTo: String(form.get("travelDateTo") ?? ""),
        adults: Number(form.get("adults")),
        children: Number(form.get("children")),
        total: Number(form.get("total")),
        currency: String(form.get("currency") ?? "PHP"),
        holdExpiresAt,
        quoteNote: String(form.get("quoteNote") ?? "") || undefined
      }),
      "Final quote accepted and booking created."
    )
  }

  function submitPayment(event: FormEvent<HTMLFormElement>, booking: BookingRecord) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(
      () => recordPaymentAction({
        bookingId: booking.id,
        kind: String(form.get("kind")) as "payment" | "refund",
        amount: Number(form.get("amount")),
        occurredAt: String(form.get("occurredAt")),
        method: String(form.get("method")) as BookingPaymentMethod,
        reference: String(form.get("reference") ?? "") || undefined,
        note: String(form.get("note") ?? "") || undefined
      }),
      "Payment activity recorded."
    )
  }

  function submitQuote(event: FormEvent<HTMLFormElement>, booking: BookingRecord) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(
      () => updateQuoteAction(
        booking.id,
        Number(form.get("total")),
        String(form.get("currency")),
        String(form.get("quoteNote") ?? "") || undefined
      ),
      "Final quote updated."
    )
  }

  const today = todayInManilaClient(data.generatedAt)

  function focusWorkspace(status: string, payment = "all", record = "all") {
    setStatusFilter(status)
    setPaymentFilter(payment)
    setRecordFilter(record)
    setWorkspaceOpen(true)
    window.requestAnimationFrame(() => workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground shadow-sm">
        <CardContent className="grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/65">
              <TrendingUp className="h-4 w-4" aria-hidden="true" /> Owner briefing
            </div>
            <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight md:text-3xl">
              {ownerInsights.overdueHolds.length
                ? `${ownerInsights.overdueHolds.length} overdue hold${ownerInsights.overdueHolds.length === 1 ? " needs" : "s need"} your decision.`
                : data.summary.newInquiries
                  ? `${data.summary.newInquiries} new ${data.summary.newInquiries === 1 ? "inquiry is" : "inquiries are"} waiting for a response.`
                  : ownerInsights.awaitingDeposit.length
                    ? `${ownerInsights.awaitingDeposit.length} held ${ownerInsights.awaitingDeposit.length === 1 ? "booking is" : "bookings are"} waiting for a deposit.`
                    : ownerInsights.balancesDue.length
                      ? `${ownerInsights.balancesDue.length} confirmed ${ownerInsights.balancesDue.length === 1 ? "booking has" : "bookings have"} a balance to collect.`
                      : "Bookings are under control. No urgent exceptions right now."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/70">
              {ownerInsights.upcoming[0]
                ? `Next travel starts ${compactDate(getBookingStartDate(ownerInsights.upcoming[0]))}: ${getBookingTitle(ownerInsights.upcoming[0])} for ${ownerInsights.upcoming[0].guestName}.`
                : "There are no held or confirmed trips currently on the forward calendar."}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-xs text-primary-foreground/60">Updated {formatDateTime(data.generatedAt)}</p>
            <Button type="button" variant="secondary" onClick={() => void loadData(true)} disabled={refreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
              Refresh business view
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetric
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="Gross booked"
          value={metricMoney(ownerInsights.grossBooked)}
          detail={`${ownerInsights.activeBookings.length} active booking${ownerInsights.activeBookings.length === 1 ? "" : "s"}`}
        />
        <ExecutiveMetric
          icon={<Banknote className="h-5 w-5" />}
          label="Net collected"
          value={metricMoney(ownerInsights.collected)}
          detail={`${metricMoney(data.summary.collectedThisMonth)} received this month`}
        />
        <ExecutiveMetric
          icon={<Clock3 className="h-5 w-5" />}
          label="Balance to collect"
          value={metricMoney(data.summary.outstandingBalances)}
          detail={`${ownerInsights.awaitingDeposit.length} held · ${ownerInsights.balancesDue.length} confirmed with balance`}
        />
        <ExecutiveMetric
          icon={<Users className="h-5 w-5" />}
          label="Inquiry conversion"
          value={`${ownerInsights.conversionRate}%`}
          detail={`${data.bookings.length} bookings from ${data.inquiries.length} inquiries`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cash position</CardTitle>
            <p className="text-sm text-muted-foreground">Booked value compared with money already received, kept separate by currency.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {ownerInsights.grossBooked.map((gross) => {
              const collected = ownerInsights.collected.find((item) => item.currency === gross.currency)?.amount ?? 0
              const progress = gross.amount > 0 ? Math.min(Math.max((collected / gross.amount) * 100, 0), 100) : 0
              return (
                <div key={gross.currency}>
                  <div className="mb-2 flex items-end justify-between gap-4">
                    <div><p className="text-sm font-semibold">{gross.currency}</p><p className="text-xs text-muted-foreground">{Math.round(progress)}% collected</p></div>
                    <div className="text-right"><p className="font-semibold">{formatMoney(collected, gross.currency)}</p><p className="text-xs text-muted-foreground">of {formatMoney(gross.amount, gross.currency)}</p></div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-label={`${gross.currency} ${Math.round(progress)} percent collected`}>
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
            {!ownerInsights.grossBooked.length ? <EmptyInsight text="Accepted bookings will appear here once business starts moving." /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <p className="text-sm text-muted-foreground">Exceptions worth acting on, ranked ahead of routine records.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttentionItem tone="urgent" count={ownerInsights.overdueHolds.length} label="Overdue holds" detail="Decide whether to extend or cancel" onClick={() => focusWorkspace("held")} />
            <AttentionItem count={data.summary.newInquiries} label="New inquiries" detail="Guests waiting for a first response" onClick={() => focusWorkspace("new", "all", "inquiry")} />
            <AttentionItem count={ownerInsights.awaitingDeposit.length} label="Awaiting deposit" detail="Held bookings not ready to confirm" onClick={() => focusWorkspace("held", "unpaid", "booking")} />
            <AttentionItem count={ownerInsights.balancesDue.length} label="Confirmed with balance" detail="Trips confirmed but not fully paid" onClick={() => focusWorkspace("confirmed", "deposit-paid", "booking")} />
          </CardContent>
        </Card>
      </div>

      <BusinessCalendar
        bookings={data.bookings}
        today={today}
        initialMonthDate={ownerInsights.upcoming[0] ? getBookingStartDate(ownerInsights.upcoming[0]) : today}
        onSelect={(booking) => {
          setSelectedKey(`booking:${booking.id}`)
          setPanelError(null)
          setPanelNotice(null)
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Portfolio snapshot</CardTitle><p className="text-sm text-muted-foreground">Where accepted business sits in the lifecycle.</p></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ["Held", data.summary.heldBookings, "Waiting for deposit or owner follow-up"],
              ["Confirmed", data.bookings.filter((booking) => booking.status === "confirmed").length, "Committed upcoming business"],
              ["Completed", data.bookings.filter((booking) => booking.status === "completed").length, "Trips already fulfilled"],
              ["Cancelled", ownerInsights.cancelled, "Lost or released business"]
            ].map(([label, count, detail]) => <div key={String(label)} className="border-l-2 border-primary/20 pl-4"><p className="text-2xl font-semibold">{count}</p><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top products</CardTitle><p className="text-sm text-muted-foreground">Products currently contributing accepted booking value.</p></CardHeader>
          <CardContent className="space-y-3">
            {ownerInsights.topProducts.map((product, index) => <div key={product.title} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{product.title}</p><p className="text-xs text-muted-foreground">{product.count} booking{product.count === 1 ? "" : "s"}</p></div></div><p className="shrink-0 text-sm font-semibold">{metricMoney(product.total)}</p></div>)}
            {!ownerInsights.topProducts.length ? <EmptyInsight text="Product performance appears after the first accepted booking." /> : null}
          </CardContent>
        </Card>
      </div>

      <Card ref={workspaceRef} className="scroll-mt-4">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle>Booking workspace</CardTitle><p className="mt-1 text-sm text-muted-foreground">Search and work individual records only when you need the operational detail.</p></div>
          <Button type="button" variant={workspaceOpen ? "outline" : "default"} onClick={() => setWorkspaceOpen((value) => !value)}>
            {workspaceOpen ? "Hide records" : `Open ${pipeline.length} records`}
          </Button>
        </CardHeader>
        {workspaceOpen ? <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guest, product, reference…" /></label>
            <select aria-label="Record type" className="h-10 rounded-md border bg-background px-3 text-sm" value={recordFilter} onChange={(event) => setRecordFilter(event.target.value)}><option value="all">All records</option><option value="inquiry">Inquiries</option><option value="booking">Bookings</option></select>
            <select aria-label="Product type" className="h-10 rounded-md border bg-background px-3 text-sm" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option value="all">All products</option><option value="stay">Condo stays</option><option value="package">Packages</option><option value="general">General</option></select>
            <select aria-label="Status" className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{["new","read","responded","accepted","declined","archived","held","confirmed","completed","cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <select aria-label="Payment status" className="h-10 rounded-md border bg-background px-3 text-sm md:col-start-2 xl:col-start-5" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}><option value="all">All payments</option>{["unpaid","deposit-paid","paid","refunded"].map((status) => <option key={status} value={status}>{status}</option>)}</select>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Guest / product</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
              <tbody className="divide-y">
                {visible.map((item) => {
                  const fields = itemFields(item)
                  const booking = item.kind === "booking" ? item.booking : null
                  const overdue = Boolean(booking?.status === "held" && booking.holdExpiresAt && booking.holdExpiresAt < data.generatedAt)
                  return <tr key={`${item.kind}:${item.id}`} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelectedKey(`${item.kind}:${item.id}`); setPanelError(null); setPanelNotice(null); setConfirmingStay(false) }}>
                    <td className="px-4 py-3"><p className="font-semibold">{fields.customer}</p><p className="text-muted-foreground">{fields.title} · {item.kind}</p>{overdue ? <p className="mt-1 text-xs font-semibold text-destructive">Hold overdue</p> : null}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fields.start ? `${fields.start}${fields.end ? ` → ${fields.end}` : ""}` : "Not set"}</td>
                    <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-xs font-semibold capitalize", statusStyle[fields.status])}>{fields.status}</span></td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{fields.paymentStatus || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">{booking ? formatMoney(booking.total, booking.currency) : "—"}</td>
                  </tr>
                })}
                {!visible.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No records match these filters.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </CardContent> : null}
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent movement</CardTitle><p className="text-sm text-muted-foreground">A concise audit of what changed across the business.</p></CardHeader>
        <CardContent>
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activities.map((activity) => <li key={activity.id} className="border-l-2 border-primary/20 pl-3"><p className="text-sm font-medium">{activity.summary}</p><p className="text-xs text-muted-foreground">{activity.customerName} · {formatDateTime(activity.occurredAt)}</p></li>)}
          </ol>
          {nextActivityOffset !== null ? <Button type="button" variant="outline" className="mt-5" disabled={refreshing} onClick={() => void loadMoreActivity()}>Load older activity</Button> : null}
        </CardContent>
      </Card>

      <AdminSidePanel open={Boolean(selected)} onClose={() => setSelectedKey(null)} title={selected ? itemFields(selected).customer : "Booking"} description={selected ? itemFields(selected).title : undefined}>
        {selected ? <div className="space-y-6">
          {panelError ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">{panelError}</p> : null}
          {panelNotice ? <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{panelNotice}</p> : null}
          {selected.kind === "inquiry" ? (
            <InquiryDetail inquiry={selected.inquiry} busy={isPending} confirmingStay={confirmingStay} setConfirmingStay={setConfirmingStay} onAcceptStay={() => runAction(() => acceptStayAction(selected.inquiry.id), "Condo booking created and dates held.")} onSubmitPackage={submitPackageQuote} />
          ) : (
            <BookingDetail booking={selected.booking} activities={bookingActivity[selected.booking.id] ?? activities} activityLoading={activityLoading} busy={isPending} today={today} onSubmitPayment={submitPayment} onSubmitQuote={submitQuote} onStatus={(status, reason) => runAction(() => changeStatusAction(selected.booking.id, status, reason), `Booking marked ${status}.`)} />
          )}
        </div> : null}
      </AdminSidePanel>
    </section>
  )
}

function ExecutiveMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><span className="text-primary">{icon}</span>{label}</div>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function AttentionItem({ count, label, detail, tone = "default", onClick }: { count: number; label: string; detail: string; tone?: "default" | "urgent"; onClick: () => void }) {
  return (
    <button type="button" disabled={count === 0} className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:opacity-55", tone === "urgent" && count > 0 && "border-destructive/30 bg-destructive/5")} onClick={onClick}>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold", tone === "urgent" && count > 0 && "bg-destructive/10 text-destructive")}>{count}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span>
      {tone === "urgent" && count > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
    </button>
  )
}

function EmptyInsight({ text }: { text: string }) {
  return <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"><CalendarDays className="h-5 w-5" aria-hidden="true" />{text}</div>
}

const calendarStatusStyle: Record<string, string> = {
  held: "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
  completed: "border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100"
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function bookingOccupiesDate(booking: BookingRecord, day: string) {
  const starts = getBookingStartDate(booking)
  const ends = getBookingEndDate(booking)
  return starts <= day && (getBookingProductType(booking) === "stay" ? ends > day : ends >= day)
}

function BusinessCalendar({ bookings, today, initialMonthDate, onSelect }: { bookings: BookingRecord[]; today: string; initialMonthDate: string; onSelect: (booking: BookingRecord) => void }) {
  const [month, setMonth] = useState(initialMonthDate.slice(0, 7))
  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number)
    const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1))
    const lastDay = new Date(Date.UTC(year, monthNumber, 0))
    const gridStart = new Date(firstDay)
    gridStart.setUTCDate(gridStart.getUTCDate() - firstDay.getUTCDay())
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setUTCDate(gridStart.getUTCDate() + index)
      return {
        key: dateKey(date),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === monthNumber - 1,
        weekStart: date.getUTCDay() === 0
      }
    })
    const visibleBookings = bookings.filter(
      (booking) =>
        booking.status !== "cancelled" &&
        getBookingStartDate(booking) <= dateKey(lastDay) &&
        getBookingEndDate(booking) >= dateKey(firstDay)
    )
    const bookedValue = currencyTotals(
      visibleBookings.map((booking) => ({ currency: booking.currency, amount: booking.total }))
    )
    return {
      cells,
      visibleBookings,
      bookedValue,
      label: firstDay.toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })
    }
  }, [bookings, month])

  function moveMonth(direction: number) {
    const [year, monthNumber] = month.split("-").map(Number)
    const next = new Date(Date.UTC(year, monthNumber - 1 + direction, 1))
    setMonth(dateKey(next).slice(0, 7))
  }

  return (
    <Card>
      <CardHeader className="gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" /><CardTitle>Business calendar</CardTitle></div>
          <p className="mt-2 text-sm text-muted-foreground">Held, confirmed, and completed bookings across condos and travel packages.</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <CalendarLegend className="bg-amber-400" label="Held" />
            <CalendarLegend className="bg-emerald-500" label="Confirmed" />
            <CalendarLegend className="bg-sky-500" label="Completed" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-right"><p className="text-sm font-semibold">{calendar.visibleBookings.length} scheduled</p><p className="text-xs text-muted-foreground">{metricMoney(calendar.bookedValue)} booked value</p></div>
          <Button type="button" variant="outline" size="icon" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" variant="outline" onClick={() => setMonth(today.slice(0, 7))}>Today</Button>
          <Button type="button" variant="outline" size="icon" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between"><h4 className="text-lg font-semibold">{calendar.label}</h4><p className="text-xs text-muted-foreground">Click a booking for details</p></div>
        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[840px]">
            <div className="grid grid-cols-7 border-b bg-muted/60">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendar.cells.map((cell) => {
                const dayBookings = calendar.visibleBookings.filter(
                  (booking) => bookingOccupiesDate(booking, cell.key)
                )
                const checkouts = calendar.visibleBookings.filter(
                  (booking) => getBookingProductType(booking) === "stay" && getBookingEndDate(booking) === cell.key
                )
                const events = [
                  ...dayBookings.map((booking) => ({ booking, checkout: false })),
                  ...checkouts.map((booking) => ({ booking, checkout: true }))
                ]
                return (
                  <div key={cell.key} className={cn("min-h-28 border-b border-r p-2 last:border-r-0", !cell.inMonth && "bg-muted/25")}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", !cell.inMonth && "text-muted-foreground", cell.key === today && "bg-primary text-primary-foreground")}>{cell.day}</span>
                      {events.length ? <span className="text-[10px] font-medium text-muted-foreground">{events.length}</span> : null}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map(({ booking, checkout }) => {
                        const showTitle = cell.key === getBookingStartDate(booking) || cell.weekStart
                        return (
                          <button key={`${booking.id}:${checkout ? "checkout" : "stay"}`} type="button" className={cn("block w-full truncate rounded border px-2 py-1 text-left text-[11px] font-medium transition-colors", checkout ? "border-border bg-muted/50 text-muted-foreground hover:bg-muted" : calendarStatusStyle[booking.status] ?? "bg-muted")} title={`${getBookingTitle(booking)} — ${booking.guestName}`} onClick={() => onSelect(booking)}>
                            {checkout ? `Checkout · ${booking.guestName}` : showTitle ? getBookingTitle(booking) : booking.guestName}
                          </button>
                        )
                      })}
                      {events.length > 3 ? <p className="px-1 text-[10px] font-medium text-muted-foreground">+{events.length - 3} more</p> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CalendarLegend({ className, label }: { className: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", className)} />{label}</span>
}

function InquiryDetail({ inquiry, busy, confirmingStay, setConfirmingStay, onAcceptStay, onSubmitPackage }: { inquiry: InquiryRecord; busy: boolean; confirmingStay: boolean; setConfirmingStay: (value: boolean) => void; onAcceptStay: () => void; onSubmitPackage: (event: FormEvent<HTMLFormElement>, inquiry: InquiryRecord) => void }) {
  const product = inquiryProduct(inquiry)
  return <>
    <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-2"><p><span className="text-muted-foreground">Email:</span> {inquiry.email}</p><p><span className="text-muted-foreground">Mobile:</span> {inquiry.mobile}</p><p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{inquiry.status}</span></p><p><span className="text-muted-foreground">Source:</span> {inquiry.source}</p></CardContent></Card>
    {product.type === "stay" ? <Card><CardHeader><CardTitle className="text-lg">Accept condo request</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{inquiry.checkIn} → {inquiry.checkOut} · {inquiry.guests ?? "—"} guests</p>{confirmingStay ? <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm"><p>Confirming creates a held booking and immediately blocks these dates.</p><div className="mt-3 flex gap-2"><Button disabled={busy} onClick={onAcceptStay}>Confirm hold</Button><Button variant="outline" disabled={busy} onClick={() => setConfirmingStay(false)}>Back</Button></div></div> : <Button className="mt-4" disabled={busy} onClick={() => setConfirmingStay(true)}>Review hold</Button>}</CardContent></Card> : null}
    {product.type === "package" ? <Card><CardHeader><CardTitle className="text-lg">Accept final package quote</CardTitle></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => onSubmitPackage(event, inquiry)}><label className="text-sm">Departure<Input name="travelDateFrom" type="date" required defaultValue={inquiry.travelDateFrom} /></label><label className="text-sm">Return<Input name="travelDateTo" type="date" required defaultValue={inquiry.travelDateTo} /></label><label className="text-sm">Adults<Input name="adults" type="number" min={1} required defaultValue={inquiry.adults ?? 1} /></label><label className="text-sm">Children<Input name="children" type="number" min={0} required defaultValue={inquiry.children ?? 0} /></label><label className="text-sm">Final total<Input name="total" type="number" min={1} step="0.01" required /></label><label className="text-sm">Currency<Input name="currency" required defaultValue="PHP" maxLength={3} /></label><label className="text-sm sm:col-span-2">Hold deadline<Input name="holdExpiresAt" type="datetime-local" /></label><label className="text-sm sm:col-span-2">Quote note<Textarea name="quoteNote" maxLength={500} /></label><Button className="sm:col-span-2" disabled={busy} type="submit">Accept final quote</Button></form></CardContent></Card> : null}
    {product.type === "general" ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">This inquiry has no selected product yet. Assign and continue it from <Link className="underline" href="/admin/inquiries">Customer Inquiries</Link>.</p> : null}
  </>
}

function BookingDetail({ booking, activities, activityLoading, busy, today, onSubmitPayment, onSubmitQuote, onStatus }: { booking: BookingRecord; activities: ActivityEvent[]; activityLoading: boolean; busy: boolean; today: string; onSubmitPayment: (event: FormEvent<HTMLFormElement>, booking: BookingRecord) => void; onSubmitQuote: (event: FormEvent<HTMLFormElement>, booking: BookingRecord) => void; onStatus: (status: "confirmed" | "completed" | "cancelled", reason?: string) => void }) {
  const totals = bookingPaymentTotals(booking)
  const [cancelReason, setCancelReason] = useState("")
  const terminal = booking.status === "cancelled" || booking.status === "completed"
  const bookingActivity = activities.filter((event) => event.bookingId === booking.id || event.entityId === booking.id)
  return <>
    <div className="grid gap-3 sm:grid-cols-4"><Metric label="Status" value={booking.status} /><Metric label="Payment" value={booking.paymentStatus} /><Metric label="Net paid" value={formatMoney(totals.netPaid, booking.currency)} /><Metric label="Balance" value={formatMoney(totals.balance, booking.currency)} /></div>
    <Card><CardHeader><CardTitle className="text-lg">Booking details</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2"><p>Reference: {booking.id}</p><p>{getBookingStartDate(booking)} → {getBookingEndDate(booking)}</p><p>{booking.guestEmail}</p><p>{booking.guestMobile}</p>{booking.holdExpiresAt ? <p className="sm:col-span-2">Hold deadline: {formatDateTime(booking.holdExpiresAt)}</p> : null}</CardContent></Card>
    {!terminal ? <Card><CardHeader><CardTitle className="text-lg">Lifecycle</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{booking.status === "held" ? <Button disabled={busy || totals.netPaid <= 0} onClick={() => onStatus("confirmed")}>Confirm booking</Button> : null}{booking.status === "confirmed" && getBookingEndDate(booking) <= today ? <Button disabled={busy} onClick={() => onStatus("completed")}>Mark completed</Button> : null}</div><label className="block text-sm">Cancellation reason<Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={500} /></label><Button variant="outline" className="text-destructive" disabled={busy || !cancelReason.trim()} onClick={() => onStatus("cancelled", cancelReason)}>Cancel booking</Button>{booking.status === "held" && totals.netPaid <= 0 ? <p className="text-xs text-muted-foreground">Record a deposit before confirmation.</p> : null}</CardContent></Card> : null}
    {!terminal ? <Card><CardHeader><CardTitle className="text-lg">Adjust final quote</CardTitle></CardHeader><CardContent><form key={booking.updatedAt} className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => onSubmitQuote(event, booking)}><label className="text-sm">Total<Input name="total" type="number" min={Math.max(totals.netPaid, 1)} step="0.01" required defaultValue={booking.total} /></label><label className="text-sm">Currency<Input name="currency" required maxLength={3} defaultValue={booking.currency} /></label><label className="text-sm sm:col-span-2">Quote note<Textarea name="quoteNote" maxLength={500} defaultValue={booking.quoteNote} /></label><Button className="sm:col-span-2" disabled={busy}>Save quote adjustment</Button></form></CardContent></Card> : null}
    <Card><CardHeader><CardTitle className="text-lg">Payment ledger</CardTitle></CardHeader><CardContent><div className="space-y-2">{getBookingPayments(booking).map((entry) => <div key={entry.id} className="flex justify-between rounded-md bg-muted p-3 text-sm"><span className="capitalize">{entry.kind} · {entry.occurredAt} · {entry.method}</span><strong>{entry.kind === "refund" ? "−" : "+"}{formatMoney(entry.amount, entry.currency)}</strong></div>)}{!getBookingPayments(booking).length ? <p className="text-sm text-muted-foreground">No payment activity yet.</p> : null}</div>{!terminal || totals.netPaid > 0 ? <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => onSubmitPayment(event, booking)}><label className="text-sm">Type<select name="kind" className="block h-10 w-full rounded-md border bg-background px-3">{terminal ? null : <option value="payment">Payment</option>}{totals.netPaid > 0 ? <option value="refund">Refund</option> : null}</select></label><label className="text-sm">Amount<Input name="amount" type="number" min={0.01} step="0.01" required /></label><label className="text-sm">Date<Input name="occurredAt" type="date" required defaultValue={today} /></label><label className="text-sm">Method<select name="method" className="block h-10 w-full rounded-md border bg-background px-3">{["bank-transfer","e-wallet","cash","card","other"].map((method) => <option key={method} value={method}>{method}</option>)}</select></label><label className="text-sm">Reference<Input name="reference" maxLength={120} /></label><label className="text-sm">Note<Input name="note" maxLength={500} /></label><Button className="sm:col-span-2" disabled={busy}>Record payment activity</Button></form> : null}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-lg">Activity timeline</CardTitle></CardHeader><CardContent><ol className="space-y-3">{bookingActivity.map((event) => <li key={event.id} className="border-l-2 border-primary/20 pl-3"><p className="text-sm font-medium">{event.summary}</p><p className="text-xs text-muted-foreground">{formatDateTime(event.occurredAt)} · {event.actor}</p></li>)}{activityLoading ? <p className="text-sm text-muted-foreground">Loading complete timeline…</p> : null}{!activityLoading && !bookingActivity.length ? <p className="text-sm text-muted-foreground">No detailed activity has been recorded yet.</p> : null}</ol></CardContent></Card>
  </>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-card p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>
}
