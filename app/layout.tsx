import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"

import { siteConfig } from "@/lib/site-config"

import "./globals.css"

// Self-hosted by next/font: previously `globals.css` named Poppins with no
// @font-face, so visitors without it installed silently got a fallback face.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap"
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.shortName}`
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description
  },
  robots: { index: true, follow: true }
}

// viewport-fit=cover lets the page paint into the notch and home-indicator
// areas; the env(safe-area-inset-*) paddings below it are what keep content
// out of them. Without cover those insets resolve to 0 and do nothing.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-PH" className={poppins.variable}>
      <body className="bg-background text-foreground antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
