"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react"

import PackageBookingForm from "@/components/PackageBookingForm"
import TravelPeriodCalendar from "@/components/TravelPeriodCalendar"
import type { ResolvedAirline } from "@/lib/airlines"
import {
  departurePrice,
  formatDepartureDay,
  type PackageDeparture
} from "@/lib/package-departures"
import { formatPricePHP } from "@/lib/price"

type Props = {
  packageId: string
  packageTitle: string
  basePrice?: number
  currency: string
  /** Upcoming departures as stored, sold-out ones included. */
  departures: PackageDeparture[]
  /** Manila date the server rendered for, so server and browser agree on "past". */
  today: string
  preview?: boolean
  /** Airlines the package flies, already resolved, for the card to name. */
  airlines?: ResolvedAirline[]
  /** The page between and around the calendar and the card. */
  children: ReactNode
}

type Booking = Omit<Props, "children" | "departures"> & {
  departures: PackageDeparture[]
  selected: PackageDeparture | null
  select: (departure: PackageDeparture) => void
  markUnavailable: (id: string) => void
  calendarRef: RefObject<HTMLDivElement>
}

const BookingContext = createContext<Booking | null>(null)

function useBooking() {
  const booking = useContext(BookingContext)
  if (!booking) throw new Error("Package booking pieces must sit inside <PackageBookingSection>.")
  return booking
}

/**
 * The travel-period calendar and the booking card share one selection, but
 * sit apart on the page: the calendar full width under the title, the card in
 * the sidebar. This holds what they share, and the page places
 * <PackageBookingCalendar /> and <PackageBookingCard /> wherever they belong
 * inside it. A bar picked on the calendar fills the card, and a shortcut
 * picked on the card scrolls the calendar to that month.
 *
 * A departure the server refuses mid-booking is marked sold out here too, so
 * the calendar stops offering what the form was just told is gone.
 */
export default function PackageBookingSection({ departures, children, ...rest }: Props) {
  const [goneIds, setGoneIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const effective = useMemo(
    () => departures.map((departure) => (goneIds.includes(departure.id) ? { ...departure, soldOut: true } : departure)),
    [departures, goneIds]
  )
  const selected = effective.find((departure) => departure.id === selectedId && !departure.soldOut) ?? null

  /*
    On a phone the card sits a full screen below the calendar, so after a pick
    a bar pinned to the bottom says what was picked and jumps to the form. It
    shows only while the calendar is on screen and the card is not: once the
    card is in view the bar would just cover it to repeat it.
  */
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const [calendarInView, setCalendarInView] = useState(false)
  const [cardInView, setCardInView] = useState(false)
  useEffect(() => {
    const calendar = calendarRef.current
    const card = document.getElementById("book")
    if (!calendar || !card || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === calendar) setCalendarInView(entry.isIntersecting)
        else setCardInView(entry.isIntersecting)
      }
    })
    observer.observe(calendar)
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  const booking: Booking = {
    ...rest,
    departures: effective,
    selected,
    select: (departure) => setSelectedId(departure.id),
    markUnavailable: (id) => {
      setGoneIds((current) => (current.includes(id) ? current : [...current, id]))
      setSelectedId(null)
    },
    calendarRef
  }

  const selectedPrice = selected ? departurePrice(rest.basePrice, selected) : undefined

  return (
    <BookingContext.Provider value={booking}>
      {children}

      {selected && calendarInView && !cardInView ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(19,44,78,0.12)] sm:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {formatDepartureDay(selected.startDate)} → {formatDepartureDay(selected.endDate)}
            </p>
            {selectedPrice !== undefined ? (
              <p className="text-xs text-muted-foreground">
                {/* "/pax", as on the posters: "per person" wraps on a narrow phone. */}
                {formatPricePHP(selectedPrice, rest.currency)}/pax
                {selected.surchargePerPax ? (
                  <span className="whitespace-nowrap">
                    {" "}
                    · incl. +{formatPricePHP(selected.surchargePerPax, rest.currency)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <a
            href="#book"
            className="inline-flex min-h-[48px] shrink-0 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            Book these dates
          </a>
        </div>
      ) : null}
    </BookingContext.Provider>
  )
}

/** The month calendar of travel periods; nothing when the package has none coming up. */
export function PackageBookingCalendar() {
  const { departures, basePrice, currency, selected, select, today, calendarRef } = useBooking()
  if (departures.length === 0) return null

  return (
    <div ref={calendarRef}>
      <TravelPeriodCalendar
        departures={departures}
        basePrice={basePrice}
        currency={currency}
        selectedId={selected?.id ?? null}
        onSelect={select}
        today={today}
      />
    </div>
  )
}

/** The "Book this package" card, filled from whatever the calendar has picked. */
export function PackageBookingCard() {
  const {
    packageId,
    packageTitle,
    basePrice,
    currency,
    departures,
    selected,
    select,
    markUnavailable,
    preview,
    airlines
  } = useBooking()

  return (
    <PackageBookingForm
      packageId={packageId}
      packageTitle={packageTitle}
      basePrice={basePrice}
      currency={currency}
      departures={departures}
      selected={selected}
      onSelect={select}
      onUnavailable={markUnavailable}
      preview={preview}
      airlines={airlines}
    />
  )
}
