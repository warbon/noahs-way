"use server"

import crypto from "node:crypto"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getAdminPassword, setAdminSessionCookie } from "@/lib/admin-auth-server"
import { checkAdminLoginRateLimit } from "@/lib/admin-rate-limit"
import { getClientIp } from "@/lib/request-ip"

function constantTimeEquals(a: string, b: string) {
  // Hash both first so timingSafeEqual gets equal-length buffers and the
  // comparison time doesn't leak the password length.
  const hashedA = crypto.createHash("sha256").update(a).digest()
  const hashedB = crypto.createHash("sha256").update(b).digest()
  return crypto.timingSafeEqual(hashedA, hashedB)
}

export async function loginAction(formData: FormData) {
  const allowed = await checkAdminLoginRateLimit(getClientIp(headers()))
  if (!allowed) {
    redirect("/admin/login?error=ratelimited")
  }

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

  if (!constantTimeEquals(password, expectedPassword)) {
    redirect("/admin/login?error=invalid")
  }

  try {
    await setAdminSessionCookie()
  } catch {
    redirect("/admin/login?error=config")
  }

  redirect("/admin/packages")
}
