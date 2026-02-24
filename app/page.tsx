import Contact from "@/components/Contact"
import Footer from "@/components/Footer"
import Hero from "@/components/Hero"
import LuxuryHighlights from "@/components/LuxuryHighlights"
import MessengerChat from "@/components/MessengerChat"
import Navbar from "@/components/Navbar"
import Packages from "@/components/Packages"
import Stories from "@/components/Stories"

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Packages />
      <LuxuryHighlights />
      <Stories />
      <Contact />
      <Footer />
      <MessengerChat />
    </main>
  )
}
