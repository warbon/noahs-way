import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { listInquiries } from "@/lib/inquiry-repository"
import { getAllPackagesForAdmin } from "@/lib/package-repository"

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ship the referenced packages alongside the inquiries so the detail panel
  // can show what the customer was actually looking at, without a second
  // request per row.
  const [inquiries, catalog] = await Promise.all([listInquiries(), getAllPackagesForAdmin()])

  const referencedIds = new Set(
    inquiries.map((inquiry) => inquiry.packageId).filter(Boolean) as string[]
  )
  const packages = [...catalog.local, ...catalog.international].filter((pkg) =>
    referencedIds.has(pkg.id)
  )

  return NextResponse.json({ inquiries, packages })
}
