"use client"

import { ChevronUp } from "lucide-react"
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SplitButtonProps = {
  /**
   * The default action, rendered as-is. Keep it a real `type="submit"` when the
   * button belongs to a form: it is the form's default button, so Enter in a
   * text field resolves to this action.
   */
  children: ReactNode
  /** Menu contents: focusable buttons, each with `role="menuitem"`. */
  menu: ReactNode
  /** Accessible name for the chevron, e.g. "More save actions". */
  label: string
  disabled?: boolean
  className?: string
}

const menuItemSelector = '[role="menuitem"]:not([disabled])'

/**
 * A primary button with a chevron that opens the less common actions beside it.
 *
 * Written by hand rather than pulled in: this is the only menu in the admin,
 * and the interesting parts are all constraints from where it is used — inside
 * AdminSidePanel's focus trap, which walks the DOM for visible focusables. So
 * the menu is unmounted when closed rather than hidden (a hidden-but-present
 * menu would still catch Tab), and positioned `absolute` rather than `fixed`
 * (a fixed element has no `offsetParent`, and the trap would skip it).
 */
export function SplitButton({ children, menu, label, disabled, className }: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // A disabled trigger can't be reached to close the menu.
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  function focusItem(index: number) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(menuItemSelector) ?? [])
    if (items.length === 0) return
    const wrapped = ((index % items.length) + items.length) % items.length
    items[wrapped]?.focus()
  }

  useEffect(() => {
    if (!open) return

    // Capture phase: the side panel closes itself on Escape from a bubble-phase
    // listener on the same target, so this has to run first and stop it.
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return
      event.stopPropagation()
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    function onPointerDown(event: globalThis.PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown, true)
    document.addEventListener("pointerdown", onPointerDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  // Opening moves focus into the menu, the way a menu button is expected to.
  useEffect(() => {
    if (open) focusItem(0)
  }, [open])

  /** Closes when focus leaves for good, which also covers Tab without fighting it. */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    setOpen(true)
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(menuItemSelector) ?? [])
    const current = items.indexOf(document.activeElement as HTMLElement)

    if (event.key === "ArrowDown") {
      event.preventDefault()
      focusItem(current + 1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      focusItem(current - 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      focusItem(0)
    } else if (event.key === "End") {
      event.preventDefault()
      focusItem(items.length - 1)
    }
  }

  return (
    <div ref={wrapperRef} onBlur={handleBlur} className={cn("relative inline-flex", className)}>
      <div className="inline-flex [&>button:first-child]:rounded-r-none">
        {children}
        <Button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleTriggerKeyDown}
          className="rounded-l-none border-l border-primary-foreground/25 px-2"
        >
          <ChevronUp
            className={cn("h-4 w-4 transition-transform", open ? "" : "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </div>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          // Any choice closes the menu; the item's own handler does the work.
          onClick={() => setOpen(false)}
          className="absolute bottom-full right-0 z-10 mb-2 w-80 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {menu}
        </div>
      ) : null}
    </div>
  )
}

/** Shared look for the buttons a caller puts in `menu`. */
export const splitButtonItemClass =
  "block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
