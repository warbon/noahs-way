"use server"

import { redirect } from "next/navigation"

import { getAdminPassword, setAdminSessionCookie } from "@/lib/admin-auth-server"

export async function loginAction(formData: FormData) {
  const password = formData.get("password")

  if (typeof password !== "string") {
    redirect("/admin/login?error=invalid")
  }

  let expectedPassword: string
  try {
    expectedPassword = getAdminPassword()
  } catch {
    redirect("/admin/login?error=config")
  }

  if (password !== expectedPassword) {
    redirect("/admin/login?error=invalid")
  }

  try {
    await setAdminSessionCookie()
  } catch {
    redirect("/admin/login?error=config")
  }

  redirect("/admin/packages")
}
