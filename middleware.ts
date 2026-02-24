import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  const isAuthenticated = await isAdminRequestAuthenticated(request)
  if (isAuthenticated) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/admin/login", request.url))
}

export const config = {
  matcher: ["/admin/:path*"]
}
