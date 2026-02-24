import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isAdminAuthenticated } from "@/lib/admin-auth-server"

import { loginAction } from "./actions"

type LoginPageProps = {
  searchParams?: {
    error?: string
  }
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin/packages")
  }

  const error = searchParams?.error

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-5 py-12 md:px-8">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-2xl border border-primary/15 bg-white p-6 shadow-xl shadow-primary/10 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
            Admin Access
          </p>
          <h1 className="mt-2 text-2xl font-bold text-primary">Sign in to manage packages</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is protected with a shared admin password.
          </p>

          {error === "invalid" ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid password. Please try again.
            </p>
          ) : null}

          {error === "config" ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Admin login is not configured. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`.
            </p>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Admin password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter admin password"
              />
            </div>

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-white"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
