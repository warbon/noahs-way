"use server"

import { redirect } from "next/navigation"

import { clearAdminSessionCookie } from "@/lib/admin-auth-server"

export async function logoutAction() {
  clearAdminSessionCookie()
  redirect("/")
}
