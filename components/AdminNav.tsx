"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const links = [
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/ai", label: "AI Assistant" }
]

export default function AdminNav() {
  const pathname = usePathname()
  const [newCount, setNewCount] = useState(0)

  // Surfaces waiting leads from any admin page — a stored inquiry nobody knows
  // about is the failure this feature exists to prevent.
  useEffect(() => {
    let cancelled = false

    async function loadCount() {
      try {
        const response = await fetch("/api/admin/inquiries", { cache: "no-store" })
        if (!response.ok) return
        const payload = (await response.json()) as { inquiries?: { status: string }[] }
        if (cancelled) return
        setNewCount((payload.inquiries ?? []).filter((i) => i.status === "new").length)
      } catch {
        /* a missing badge is not worth surfacing an error for */
      }
    }

    void loadCount()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <nav aria-label="Admin sections" className="flex gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href
        const showBadge = link.href === "/admin/inquiries" && newCount > 0

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            )}
          >
            {link.label}
            {showBadge ? (
              <span
                // Keyed on the count so the pop replays whenever it changes.
                key={newCount}
                className="badge-pop inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground"
                aria-label={`${newCount} new`}
              >
                {newCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
