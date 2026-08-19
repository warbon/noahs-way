/**
 * Placeholder rows shown while an admin list loads. Mirrors the real row's
 * shape so the layout doesn't jump when data arrives.
 */
export default function AdminListSkeleton({
  rows = 5,
  withThumbnail = false
}: {
  rows?: number
  withThumbnail?: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 p-4">
          {withThumbnail ? (
            <div className="skeleton h-16 w-24 shrink-0 rounded-md" aria-hidden="true" />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2" aria-hidden="true">
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/4 rounded" />
          </div>
          <div className="skeleton h-9 w-20 shrink-0 rounded-md" aria-hidden="true" />
        </div>
      ))}
    </div>
  )
}
