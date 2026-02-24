"use client"

import BrandLogo from "@/components/BrandLogo"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-5 py-3 backdrop-blur md:px-8">
      <a href="#" className="shrink-0">
        <BrandLogo compact />
      </a>
      <nav className="hidden gap-8 text-sm font-semibold text-primary md:flex">
        <a href="#packages">Packages</a>
        <a href="#stories">Stories</a>
        <a href="#contact">Contact</a>
      </nav>
      <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
        Book Now
      </Button>
    </header>
  )
}
