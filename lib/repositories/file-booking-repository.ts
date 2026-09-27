import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { isBookingRecord, type BookingRecord } from "@/lib/booking-types"

const DATA_DIR_PATH = path.join(process.cwd(), "data")
const BOOKINGS_JSON_PATH =
  process.env.BOOKING_JSON_PATH || path.join(DATA_DIR_PATH, "bookings.json")

async function readBookings(): Promise<BookingRecord[]> {
  try {
    const raw = await readFile(BOOKINGS_JSON_PATH, "utf8")
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isBookingRecord) : []
  } catch {
    return []
  }
}

async function writeBookings(bookings: BookingRecord[]) {
  await mkdir(path.dirname(BOOKINGS_JSON_PATH), { recursive: true })
  await writeFile(BOOKINGS_JSON_PATH, `${JSON.stringify(bookings, null, 2)}\n`, "utf8")
}

let mutationQueue: Promise<unknown> = Promise.resolve()

function serializeMutation<T>(operation: () => Promise<T>): Promise<T> {
  const pending = mutationQueue.then(operation, operation)
  mutationQueue = pending.then(
    () => undefined,
    () => undefined
  )
  return pending
}

export async function getFileBookingById(id: string): Promise<BookingRecord | null> {
  const bookings = await readBookings()
  return bookings.find((booking) => booking.id === id) ?? null
}

export async function listFileBookings(): Promise<BookingRecord[]> {
  return readBookings()
}

export async function getFileBookingByInquiryId(
  inquiryId: string
): Promise<BookingRecord | null> {
  const bookings = await readBookings()
  return bookings.find((booking) => booking.inquiryId === inquiryId) ?? null
}

export async function createFileBooking(booking: BookingRecord): Promise<void> {
  await serializeMutation(async () => {
    const bookings = await readBookings()
    if (bookings.some((item) => item.id === booking.id || item.inquiryId === booking.inquiryId)) {
      return
    }
    await writeBookings([booking, ...bookings])
  })
}

export async function updateFileBooking(
  id: string,
  replacement: BookingRecord,
  expectedUpdatedAt?: string
): Promise<BookingRecord | null> {
  return serializeMutation(async () => {
    const bookings = await readBookings()
    const index = bookings.findIndex((booking) => booking.id === id)
    if (index === -1) return null
    if (expectedUpdatedAt && bookings[index].updatedAt !== expectedUpdatedAt) return null
    bookings[index] = replacement
    await writeBookings(bookings)
    return replacement
  })
}
