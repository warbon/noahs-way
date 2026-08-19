import Link from "next/link"

import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            404
          </p>
          <h1 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-4 text-muted-foreground">
            The package may have been renamed or is no longer offered. Browse our current
            trips, or get in touch and we&apos;ll help you plan one.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/packages/local" className={cn(buttonVariants())}>
              Local packages
            </Link>
            <Link href="/packages/international" className={cn(buttonVariants())}>
              International packages
            </Link>
            <Link href="/#contact" className={cn(buttonVariants({ variant: "outline" }))}>
              Contact us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
