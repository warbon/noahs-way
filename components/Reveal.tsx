"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"

/** Direction the element travels from as it reveals. */
export type RevealVariant = "up" | "left" | "right" | "scale"

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
  variant?: RevealVariant
}

export default function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  variant = "up"
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current

    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setIsVisible(false)
          }
        })
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [once])

  return (
    <div
      ref={ref}
      data-variant={variant}
      className={`reveal-on-scroll ${isVisible ? "is-visible" : ""} ${className ?? ""}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
