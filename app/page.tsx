import { unstable_noStore as noStore } from "next/cache"

import Contact from "@/components/Contact"
import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import GuidesPreview from "@/components/GuidesPreview"
import HowItWorks from "@/components/HowItWorks"
import Navbar from "@/components/Navbar"
import OrganizationJsonLd from "@/components/OrganizationJsonLd"
import Packages from "@/components/Packages"
import Stories from "@/components/Stories"
import { getPackagesByCategory } from "@/lib/package-repository"

export default async function Home() {
  noStore()

  // The hero advertises live inventory, so it reads the same catalog the
  // package rows do — it cannot drift into selling trips that don't exist.
  const [local, international] = await Promise.all([
    getPackagesByCategory("local"),
    getPackagesByCategory("international")
  ])

  return (
    <>
      <OrganizationJsonLd />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero packages={[...international, ...local]} />
        <Packages />
        <HowItWorks />
        <Stories />
        <GuidesPreview />
        <Contact />
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
