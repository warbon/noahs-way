import { NextRequest, NextResponse } from "next/server"

import { isAdminRequestAuthenticated } from "@/lib/admin-auth"
import { toPublicFacebookSettings } from "@/lib/facebook/public-settings"
import {
  FacebookSettingsValidationError,
  getFacebookSettings,
  updateFacebookSettings
} from "@/lib/facebook/settings-repository"
import type {
  FacebookSettingsRecord,
  FacebookSettingsUpdate
} from "@/lib/facebook/settings-types"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  return NextResponse.json({ settings: toPublicFacebookSettings(await getFacebookSettings()) })
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminRequestAuthenticated(request))) {
    return errorResponse("Unauthorized", 401)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse("Invalid request body", 400)
  }

  if (!payload || typeof payload !== "object") {
    return errorResponse("Invalid request body", 400)
  }

  const body = payload as Record<string, unknown>
  const update: FacebookSettingsUpdate = {}

  if ("enabled" in body) {
    if (typeof body.enabled !== "boolean") return errorResponse("`enabled` must be a boolean", 400)
    update.enabled = body.enabled
  }

  if ("pageId" in body) {
    if (body.pageId !== null && typeof body.pageId !== "string") {
      return errorResponse("`pageId` must be a string or null", 400)
    }
    update.pageId = body.pageId as string | null
  }

  if ("hashtags" in body) {
    if (body.hashtags !== null && typeof body.hashtags !== "string") {
      return errorResponse("`hashtags` must be a string or null", 400)
    }
    update.hashtags = body.hashtags as string | null
  }

  // Three states, and they are not interchangeable: an absent `accessToken`
  // means "keep the stored one" — the panel cannot echo a token back, so a plain
  // Save must not wipe it — while an explicit null means "remove it".
  if ("accessToken" in body) {
    if (body.accessToken !== null && typeof body.accessToken !== "string") {
      return errorResponse("`accessToken` must be a string or null", 400)
    }
    update.accessToken = body.accessToken as string | null
  }

  if (Object.keys(update).length === 0) {
    return errorResponse("No changes provided", 400)
  }

  let saved: FacebookSettingsRecord
  try {
    saved = await updateFacebookSettings(update)
  } catch (error) {
    if (error instanceof FacebookSettingsValidationError) {
      return errorResponse(error.message, 400)
    }
    console.error("[facebook] Could not save settings", error)
    return errorResponse("Could not save settings", 500)
  }

  return NextResponse.json({ settings: toPublicFacebookSettings(saved) })
}
