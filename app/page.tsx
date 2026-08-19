import Contact from "@/components/Contact"
import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import LuxuryHighlights from "@/components/LuxuryHighlights"
import Navbar from "@/components/Navbar"
import OrganizationJsonLd from "@/components/OrganizationJsonLd"
import Packages from "@/components/Packages"
import Stories from "@/components/Stories"

export default function Home() {
  return (
    <>
      <OrganizationJsonLd />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Packages />
        <LuxuryHighlights />
        <Stories />
        <Contact />
      </main>
      <Footer />
      <ContactFab />
      <BackToTop />
    </>
  )
}
