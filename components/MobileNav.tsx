"use client"

import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { messengerHref, phoneHref, siteConfig } from "@/lib/site-config"

export type NavLink = { href: string; label: string }

/** Must match the panel-slide-out animation duration in globals.css. */
const EXIT_DURATION_MS = 300

export default function MobileNav({ links }: { links: NavLink[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Stay mounted for the exit animation, then unmount. Mounts straight into the
  // open state — the CSS animation supplies the off-screen start.
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setIsRendered(true)
      return
    }

    if (!isRendered) return

    setIsClosing(true)
    const timer = window.setTimeout(() => {
      setIsRendered(false)
      setIsClosing(false)
    }, EXIT_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [isOpen, isRendered])

  // Close on route change so tapping a link doesn't leave the panel covering
  // the page it just navigated to.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return

    const toggle = toggleRef.current
    document.body.style.overflow = "hidden"

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      )

    focusables()[0]?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        return
      }

      if (event.key !== "Tab") return

      const items = focusables()
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
      // Return focus to the trigger — the correct restore target for a menu,
      // and reliable even when the panel was opened without a real focus event.
      toggle?.focus()
    }
  }, [isOpen])

  const panel = (
    <div className="fixed inset-0 z-50">
      <div
        className="panel-backdrop absolute inset-0 bg-black/50"
        data-state={isClosing ? "closed" : "open"}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        data-state={isClosing ? "closed" : "open"}
        className="panel-sheet absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col overflow-y-auto bg-background p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pr-[calc(1.5rem+env(safe-area-inset-right))] pt-[calc(1.5rem+env(safe-area-inset-top))] shadow-2xl"
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main" className="panel-stagger flex flex-col">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-3 text-lg font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/#contact"
          className={cn(
            buttonVariants(),
            "mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
          )}
        >
          Book Now
        </Link>

        <div className="mt-6 space-y-2 border-t pt-6 text-sm">
          <a href={phoneHref} className="block font-semibold text-primary">
            Call {siteConfig.phone}
          </a>
          <a
            href={messengerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-semibold text-primary"
          >
            Message us on Messenger
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      {/*
        Portalled to <body>: the sticky header uses backdrop-blur, which makes it
        the containing block for fixed descendants and would otherwise clip this
        overlay to the header's height.
      */}
      {isRendered && isMounted ? createPortal(panel, document.body) : null}
    </div>
  )
}
