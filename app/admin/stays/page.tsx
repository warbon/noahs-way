import { redirect } from "next/navigation"

import AdminNav from "@/components/AdminNav"
import AdminStayManagerPanel from "@/components/AdminStayManagerPanel"
import { Button } from "@/components/ui/button"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

import { logoutAction } from "../packages/actions"

export default async function AdminStaysPage() {
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
            <h1 className="mt-2 text-3xl font-bold text-primary">Condo Stays</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Listings and availability for the short-stay units.
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

        <AdminStayManagerPanel />
      </div>
    </main>
  )
}
