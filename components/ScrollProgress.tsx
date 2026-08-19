"use client"

import { useEffect, useRef } from "react"

/**
 * Thin reading-progress bar for long pages. Written straight to a CSS custom
 * property inside rAF rather than through React state, so scrolling never
 * triggers a re-render.
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0
      barRef.current?.style.setProperty("--progress", String(Math.min(Math.max(progress, 0), 1)))
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
    >
      <div ref={barRef} className="scroll-progress h-full w-full bg-accent" />
    </div>
  )
}
