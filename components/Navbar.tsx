"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import BrandLogo from "@/components/BrandLogo"
import MobileNav, { type NavLink } from "@/components/MobileNav"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Root-relative so these keep working from /packages/* pages, where the
// homepage section anchors don't exist.
const navLinks: NavLink[] = [
  // Points at the full catalog (search + sort), not the homepage carousel —
  // clicking "Packages" should land on the browsable index.
  { href: "/packages", label: "Packages" },
  { href: "/packages/local", label: "Local" },
  { href: "/packages/international", label: "International" },
  { href: "/#stories", label: "Stories" },
  { href: "/#contact", label: "Contact" }
]

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  // Lifts the header off the page once it starts overlapping content.
  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      setIsScrolled(window.scrollY > 8)
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <header
      data-scrolled={isScrolled}
      className="site-header sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-5 py-3 backdrop-blur md:px-8"
    >
      <Link href="/" className="shrink-0" aria-label="Noah's Way Travel — home">
        <BrandLogo compact />
      </Link>

      <nav aria-label="Main" className="hidden gap-7 text-sm font-semibold text-primary md:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-sm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/#contact"
          className={cn(
            buttonVariants(),
            "hidden bg-accent text-accent-foreground hover:bg-accent/90 md:inline-flex"
          )}
        >
          Book Now
        </Link>
        <MobileNav links={navLinks} />
      </div>
    </header>
  )
}
