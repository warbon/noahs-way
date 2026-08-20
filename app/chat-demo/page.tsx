import { notFound } from "next/navigation"

import ChatDemo from "@/components/chat/ChatDemo"
import { loadPublishedCatalog, toChatPackageSummary } from "@/lib/ai/catalog"

/**
 * Scripted walkthrough of the booking assistant.
 *
 * Renders the real widgets from the real registry against real catalog data,
 * with a fixed script standing in for the model — so the flow can be reviewed
 * without spending an API call. Dev only: it does not exist in production.
 */
export const metadata = {
  title: "Booking assistant demo",
  robots: { index: false, follow: false }
}

export default async function ChatDemoPage() {
  if (process.env.NODE_ENV === "production") notFound()

  const catalog = await loadPublishedCatalog()

  // Prefer international packages so the scripted "Korea" question makes sense,
  // falling back to whatever the catalog actually holds.
  const preferred = catalog.filter((entry) => entry.category === "international")
  const chosen = (preferred.length >= 3 ? preferred : catalog).slice(0, 3)

  return <ChatDemo packages={chosen.map(toChatPackageSummary)} />
}
