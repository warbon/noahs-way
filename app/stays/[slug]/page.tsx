import type { Metadata } from "next"
import { unstable_noStore as noStore } from "next/cache"
import { notFound } from "next/navigation"

import BackToTop from "@/components/BackToTop"
import ContactFab from "@/components/ContactFab"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import StayDetailView from "@/components/StayDetailView"
import StayJsonLd from "@/components/StayJsonLd"
import { getStays } from "@/lib/stay-repository"
import type { StayRecord } from "@/lib/stay-repository-types"
import { findStayBySlug } from "@/lib/stay-slug"

type PageProps = {
  params: { slug: string }
}

async function loadStay(slug: string): Promise<StayRecord | null> {
  const stays = await getStays()
  return (findStayBySlug(stays, slug) as StayRecord | undefined) ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stay = await loadStay(params.slug)
  if (!stay) return { title: "Stay not found" }

  const title = `${stay.title} — ${stay.city}`
  const description =
    stay.summary ?? `${stay.details} Nightly rate, availability and house rules.`

  return {
    title,
    description,
    alternates: { canonical: `/stays/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `/stays/${params.slug}`,
      images: [{ url: stay.previewImage }]
    }
  }
}

export default async function StayPage({ params }: PageProps) {
  noStore()

  const stay = await loadStay(params.slug)
  if (!stay) notFound()

  return (
    <>
      <StayJsonLd stay={stay} />
      <Navbar />
      <StayDetailView stay={stay} />
      <Footer />
      {/*
        No assistant here. This page already shows the calendar, the total and
        the request form — the assistant would only offer a slower way to ask
        what is on screen. It stays available everywhere a visitor is still
        choosing, including /stays.
      */}
      <ContactFab hideAssistant />
      <BackToTop />
    </>
  )
}
