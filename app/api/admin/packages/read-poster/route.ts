import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { PosterExtractionError, extractPosterFields } from "@/lib/ai/poster-extraction"

/**
 * Proposes package fields read off an uploaded poster.
 *
 * Deliberately does not touch the catalog. It returns a suggestion the admin
 * form fills in for review — saving stays behind the existing POST/PATCH
 * routes, so a misread price can never reach the storefront unseen.
 */

/**
 * Reading a poster is the slowest request the app makes — measured between 10
 * and 280 seconds, median around 35 — because the model reads every printed
 * line off the image before answering.
 *
 * Without this the platform default applies, which is 10 seconds. Every read
 * would be killed mid-flight in production and come back missing most of its
 * fields, while working fine locally where no such ceiling exists. The other
 * two AI routes already set their own ceilings; this one was overlooked.
 *
 * 60 is the highest a Vercel Hobby plan accepts. On Pro this can go to 300,
 * which is what the slowest posters actually need.
 */
export const maxDuration = 60

/** Matches the upload ceiling on the package routes. */
const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse("Expected a multipart form upload.", 400)
  }

  const image = formData.get("image")

  if (!(image instanceof File) || image.size === 0) {
    return errorResponse("Attach a poster image first.", 400)
  }

  if (!ALLOWED_TYPES.has(image.type)) {
    return errorResponse("Poster must be a JPEG, PNG or WebP image.", 415)
  }

  if (image.size > MAX_UPLOAD_SIZE_BYTES) {
    return errorResponse("Poster is larger than 8MB.", 413)
  }

  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64")

  try {
    const result = await extractPosterFields(base64, image.type)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PosterExtractionError) {
      return errorResponse(error.message, error.status)
    }
    console.error("[read-poster] unexpected failure", error)
    return errorResponse("Could not read the poster.", 500)
  }
}
