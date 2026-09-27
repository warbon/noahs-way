export type ActivityActor = "admin" | "system"
export type ActivityEntityType = "inquiry" | "booking"

export type ActivityKind =
  | "inquiry.received"
  | "inquiry.status-changed"
  | "booking.created"
  | "booking.quote-updated"
  | "booking.status-changed"
  | "booking.payment-recorded"
  | "booking.refund-recorded"
  | "booking.dates-released"
  | "notification.sent"
  | "notification.failed"

export type ActivityEvent = {
  id: string
  entityType: ActivityEntityType
  entityId: string
  inquiryId?: string
  bookingId?: string
  productType?: "stay" | "package"
  customerName: string
  kind: ActivityKind
  summary: string
  actor: ActivityActor
  occurredAt: string
  metadata?: Record<string, string | number | boolean | null>
}

export function isActivityEvent(value: unknown): value is ActivityEvent {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    (record.entityType === "inquiry" || record.entityType === "booking") &&
    typeof record.entityId === "string" &&
    typeof record.customerName === "string" &&
    typeof record.kind === "string" &&
    typeof record.summary === "string" &&
    (record.actor === "admin" || record.actor === "system") &&
    typeof record.occurredAt === "string"
  )
}
