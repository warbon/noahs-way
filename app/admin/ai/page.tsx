import { redirect } from "next/navigation"

import AdminAiSettingsPanel from "@/components/AdminAiSettingsPanel"
import AdminNav from "@/components/AdminNav"
import { Button } from "@/components/ui/button"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

import { logoutAction } from "../packages/actions"

export const metadata = {
  title: "AI assistant settings",
  robots: { index: false, follow: false }
}

export default async function AdminAiSettingsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login")
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-5 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary">AI Assistant</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Switch the booking chat on or off, and set the provider, API key, and model it runs
              on. Saved here, these override the matching environment variables.
            </p>
            <div className="mt-4">
              <AdminNav />
            </div>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Log Out
            </Button>
          </form>
        </header>

        <AdminAiSettingsPanel />
      </div>
    </main>
  )
}
