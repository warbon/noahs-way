"use client"

import { X } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

type AdminSidePanelProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  /** Rendered in a sticky footer, e.g. save/cancel. */
  footer?: ReactNode
}

/** Must match the panel-slide-out animation duration in globals.css. */
const EXIT_DURATION_MS = 300

/**
 * Right-hand drawer used for both creating and editing a package. Portalled to
 * <body> so no ancestor's transform or backdrop-filter can clip it, with the
 * focus handling a modal needs: initial focus, Tab trapped inside, focus
 * restored to whatever opened it. Slides in and out, staying mounted for the
 * length of the exit transition.
 */
export default function AdminSidePanel({
  open,
  title,
  description,
  onClose,
  children,
  footer
}: AdminSidePanelProps) {
  const [isMounted, setIsMounted] = useState(false)
  // Kept mounted through the closing animation, then torn down.
  const [isRendered, setIsRendered] = useState(open)
  const [isClosing, setIsClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      // Mount straight into the open state — the CSS animation supplies the
      // off-screen start, so no pre-paint frame is needed.
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
  }, [open, isRendered])

  useEffect(() => {
    if (!open) return

    openerRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null)

    // Focus the first real field rather than the close button, so the panel is
    // immediately typable.
    const first = focusables()
    ;(first.find((el) => el.tagName !== "BUTTON") ?? first[0])?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== "Tab") return

      const items = focusables()
      if (items.length === 0) return

      const firstItem = items[0]
      const lastItem = items[items.length - 1]

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
      openerRef.current?.focus()
    }
  }, [open, onClose])

  if (!isRendered || !isMounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="panel-backdrop absolute inset-0 bg-black/50"
        data-state={isClosing ? "closed" : "open"}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-side-panel-title"
        data-state={isClosing ? "closed" : "open"}
        className="panel-sheet absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-background shadow-2xl lg:max-w-4xl xl:max-w-5xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id="admin-side-panel-title" className="text-lg font-bold text-primary">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="panel-stagger flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-border bg-muted/40 px-6 py-4">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
