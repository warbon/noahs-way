import { cookies } from "next/headers"

import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken
} from "@/lib/admin-auth"

function isProduction() {
  return process.env.NODE_ENV === "production"
}

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    throw new Error("Missing ADMIN_PASSWORD environment variable")
  }

  return password
}

export async function setAdminSessionCookie() {
  const token = await createAdminSessionToken()

  cookies().set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  })
}

export function clearAdminSessionCookie() {
  cookies().set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 0
  })
}

export async function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value
  if (!token) return false

  try {
    return await verifyAdminSessionToken(token)
  } catch {
    return false
  }
}
