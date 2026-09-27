import assert from "node:assert/strict"
import test from "node:test"

import {
  bookingPaymentTotals,
  deriveBookingPaymentStatus,
  isBookingPaymentKind,
  isBookingPaymentMethod,
  isBookingRecord,
  isBookingStatus
} from "../lib/booking-types.ts"

function booking(overrides = {}) {
  return {
    id: "book-1",
    inquiryId: "inq-1",
    productType: "stay",
    stayId: "stay-1",
    stayTitle: "Test condo",
    staySlug: "test-condo",
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestMobile: "09170000000",
    checkIn: "2026-10-01",
    checkOut: "2026-10-03",
    nights: 2,
    nightlyRate: 1000,
    cleaningFee: 0,
    accommodation: 2000,
    total: 2000,
    currency: "PHP",
    status: "held",
    paymentStatus: "unpaid",
    payments: [],
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
    ...overrides
  }
}

function payment(overrides = {}) {
  return {
    id: "pay-1",
    kind: "payment",
    amount: 500,
    currency: "PHP",
    occurredAt: "2026-09-27",
    method: "bank-transfer",
    recordedAt: "2026-09-27T00:00:00.000Z",
    ...overrides
  }
}

test("booking enum guards reject forged Server Action values", () => {
  assert.equal(isBookingStatus("confirmed"), true)
  assert.equal(isBookingStatus("refunded"), false)
  assert.equal(isBookingPaymentKind("refund"), true)
  assert.equal(isBookingPaymentKind("chargeback"), false)
  assert.equal(isBookingPaymentMethod("e-wallet"), true)
  assert.equal(isBookingPaymentMethod("crypto"), false)
})

test("booking reader rejects invalid lifecycle and ledger values", () => {
  assert.equal(isBookingRecord(booking()), true)
  assert.equal(isBookingRecord(booking({ status: "refunded" })), false)
  assert.equal(isBookingRecord(booking({ payments: [payment({ kind: "chargeback" })] })), false)
  assert.equal(isBookingRecord(booking({ payments: [payment({ amount: -1 })] })), false)
})

test("payment totals and statuses account for refunds", () => {
  const partiallyPaid = booking({ payments: [payment()] })
  assert.deepEqual(bookingPaymentTotals(partiallyPaid), {
    paid: 500,
    refunded: 0,
    netPaid: 500,
    balance: 1500
  })
  assert.equal(deriveBookingPaymentStatus(partiallyPaid), "deposit-paid")

  const fullyPaid = booking({ payments: [payment({ amount: 2000 })] })
  assert.equal(deriveBookingPaymentStatus(fullyPaid), "paid")

  const refunded = booking({
    payments: [payment({ amount: 2000 }), payment({ id: "refund-1", kind: "refund", amount: 2000 })]
  })
  assert.equal(deriveBookingPaymentStatus(refunded), "refunded")
})
