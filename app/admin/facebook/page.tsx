import { redirect } from "next/navigation"

import AdminFacebookSettingsPanel from "@/components/AdminFacebookSettingsPanel"
import AdminNav from "@/components/AdminNav"
import { Button } from "@/components/ui/button"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

import { logoutAction } from "../packages/actions"

export const metadata = {
  title: "Facebook Page settings",
  robots: { index: false, follow: false }
}

export default async function AdminFacebookPage() {
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
            <h1 className="mt-2 text-3xl font-bold text-primary">Facebook Page</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect the Page so a published package can be posted to it from the package list.
              Nothing is ever posted automatically — every post is a button press.
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

        <AdminFacebookSettingsPanel />
      </div>
    </main>
  )
}
