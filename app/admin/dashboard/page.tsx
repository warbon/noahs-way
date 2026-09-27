import { redirect } from "next/navigation"

import AdminBookingDashboard from "@/components/AdminBookingDashboard"
import AdminNav from "@/components/AdminNav"
import { Button } from "@/components/ui/button"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"
import { getBookingDashboardData } from "@/lib/booking-dashboard"

import { logoutAction } from "../packages/actions"

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login")
  const initialData = await getBookingDashboardData()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-full lg:basis-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-primary">Business Command Center</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Revenue, cash exposure, priorities, and upcoming travel at a glance.
            </p>
            <div className="mt-4"><AdminNav /></div>
          </div>
          <form action={logoutAction}><Button type="submit" variant="outline">Log Out</Button></form>
        </header>
        <AdminBookingDashboard initialData={initialData} />
      </div>
    </main>
  )
}
