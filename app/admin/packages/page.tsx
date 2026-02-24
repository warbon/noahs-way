import { redirect } from "next/navigation"

import AdminPackageManagerPanel from "@/components/AdminPackageManagerPanel"
import { Button } from "@/components/ui/button"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

import { logoutAction } from "./actions"

export default async function AdminPackagesPage() {
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
            <h1 className="mt-2 text-3xl font-bold text-primary">Package Manager</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Protected admin page for uploading package data and images.
            </p>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Log Out
            </Button>
          </form>
        </header>

        <AdminPackageManagerPanel />
      </div>
    </main>
  )
}
