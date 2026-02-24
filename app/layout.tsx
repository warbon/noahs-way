import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Noah's Way Travel",
  description: "Forget the Map - Travel Beyond Boundaries"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
