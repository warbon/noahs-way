"use client"

import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PublicFacebookSettings } from "@/lib/facebook/settings-types"
import { cn } from "@/lib/utils"

type TestResult = { ok: boolean; message: string }

const tokenSourceLabels: Record<PublicFacebookSettings["resolved"]["tokenSource"], string> = {
  settings: "the token saved here",
  env: "the FACEBOOK_PAGE_ACCESS_TOKEN environment variable",
  none: "nothing — no token is configured"
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

export default function AdminFacebookSettingsPanel() {
  const [settings, setSettings] = useState<PublicFacebookSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [pageId, setPageId] = useState("")
  const [hashtags, setHashtags] = useState("")
  // Blank means "leave the stored token alone" — the panel can never read one
  // back, so it must not be able to overwrite one by accident.
  const [tokenDraft, setTokenDraft] = useState("")
  const [clearToken, setClearToken] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const applySettings = useCallback((next: PublicFacebookSettings) => {
    setSettings(next)
    setEnabled(next.enabled)
    setPageId(next.pageId ?? "")
    setHashtags(next.hashtags ?? "")
    setTokenDraft("")
    setClearToken(false)
  }, [])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/admin/facebook-settings", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as {
        settings?: PublicFacebookSettings
      } | null

      if (!response.ok || !payload?.settings) {
        setLoadError(getApiErrorMessage(payload) ?? "Could not load Facebook settings.")
        return
      }

      applySettings(payload.settings)
    } catch {
      setLoadError("Could not load Facebook settings.")
    } finally {
      setLoading(false)
    }
  }, [applySettings])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setTestResult(null)

    const body: Record<string, unknown> = {
      enabled,
      pageId: pageId.trim() || null,
      hashtags: hashtags.trim() || null
    }

    const draft = tokenDraft.trim()
    if (draft) body.accessToken = draft
    else if (clearToken) body.accessToken = null

    try {
      const response = await fetch("/api/admin/facebook-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const payload = (await response.json().catch(() => null)) as {
        settings?: PublicFacebookSettings
      } | null

      if (!response.ok || !payload?.settings) {
        setSaveError(getApiErrorMessage(payload) ?? "Could not save Facebook settings.")
        return
      }

      applySettings(payload.settings)
      setSavedAt(Date.now())
    } catch {
      setSaveError("Could not save Facebook settings.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch("/api/admin/facebook-settings/test", { method: "POST" })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        page?: { id: string; name: string; category: string | null }
        error?: string
      } | null

      if (!response.ok || !payload) {
        setTestResult({
          ok: false,
          message: getApiErrorMessage(payload) ?? "The test could not run."
        })
        return
      }

      if (payload.ok && payload.page) {
        setTestResult({
          ok: true,
          message: `the token belongs to “${payload.page.name}” (id ${payload.page.id}).`
        })
        // The test caches the Page name server-side, so pull the fresh record in.
        void loadSettings()
        return
      }

      setTestResult({ ok: false, message: payload.error ?? "Facebook rejected the request." })
    } catch {
      setTestResult({ ok: false, message: "The test could not run." })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-white p-6 text-sm text-muted-foreground shadow-sm">
        Loading Facebook settings…
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{loadError ?? "Could not load Facebook settings."}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void loadSettings()}>
          Try again
        </Button>
      </div>
    )
  }

  const { resolved } = settings

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section
        className={cn(
          "rounded-2xl border p-5",
          resolved.available
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          {resolved.available ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          )}
          {resolved.available
            ? "Packages can be posted to the Page"
            : "Sharing is not ready — the button in Packages will refuse"}
        </p>
        <p className="mt-2 text-sm">
          {resolved.pageId ? (
            <>
              Posting to{" "}
              <strong>{settings.pageName ?? `Page ${resolved.pageId}`}</strong>, authenticated by{" "}
              {tokenSourceLabels[resolved.tokenSource]}.
            </>
          ) : (
            <>No Page id is configured yet.</>
          )}
        </p>
        {!settings.enabled ? (
          <p className="mt-2 text-sm">
            Sharing ships switched off, so a token on its own can never post to the Page. Tick{" "}
            <strong>Allow posting to the Page</strong> below and save.
          </p>
        ) : null}
        {resolved.storedTokenUnreadable ? (
          <p className="mt-2 text-sm">
            The saved token could not be decrypted — this happens when{" "}
            <code>ADMIN_SESSION_SECRET</code> changes. Enter the token again below.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-primary/15 bg-white p-5 shadow-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Allow posting to the Page</span>
            <span className="block text-sm text-muted-foreground">
              Nothing is posted automatically either way — this only decides whether the{" "}
              <strong>Post to Facebook</strong> button in Packages is allowed to publish.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <label htmlFor="facebook-page-id" className="text-sm font-medium">
            Page id or @handle
          </label>
          <Input
            id="facebook-page-id"
            autoComplete="off"
            spellCheck={false}
            value={pageId}
            onChange={(event) => setPageId(event.target.value)}
            placeholder="e.g. 102938475610293 or noahswaytravelandtours"
          />
          <p className="text-sm text-muted-foreground">
            Find the numeric id in Meta Business Suite under <em>Settings → Page details</em>, or
            paste the handle from the Page URL.
            {settings.hasEnvPageId && !settings.pageId ? (
              <>
                {" "}
                Leaving this blank falls back to the <code>FACEBOOK_PAGE_ID</code> environment
                variable.
              </>
            ) : null}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="facebook-token" className="text-sm font-medium">
            Page access token
          </label>
          <Input
            id="facebook-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={tokenDraft}
            onChange={(event) => {
              setTokenDraft(event.target.value)
              if (event.target.value) setClearToken(false)
            }}
            placeholder={
              settings.hasStoredToken ? "Enter a new token to replace the saved one" : "Paste the Page access token"
            }
          />
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            {clearToken ? (
              <span className="text-amber-700">Token will be removed when you save.</span>
            ) : settings.hasStoredToken ? (
              <>
                <span>
                  Saved token ending <code>{settings.tokenPreview ?? "????"}</code>, encrypted at
                  rest.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setClearToken(true)
                    setTokenDraft("")
                  }}
                  className="font-medium text-destructive underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </>
            ) : settings.hasEnvToken ? (
              <span>
                No token saved here — falling back to the{" "}
                <code>FACEBOOK_PAGE_ACCESS_TOKEN</code> environment variable.
              </span>
            ) : (
              <span>No token configured.</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            This must be a <strong>Page</strong> access token with the{" "}
            <code>pages_manage_posts</code> and <code>pages_read_engagement</code> permissions — a
            personal user token cannot post as the business. A long-lived Page token does not
            expire on its own, but it is revoked if the admin who issued it loses access to the
            Page or changes their password, so expect to re-enter it occasionally.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="facebook-hashtags" className="text-sm font-medium">
            Hashtags <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="facebook-hashtags"
            autoComplete="off"
            spellCheck={false}
            value={hashtags}
            onChange={(event) => setHashtags(event.target.value)}
            placeholder="#NoahsWayTravel #TravelPhilippines"
          />
          <p className="text-sm text-muted-foreground">
            Added to the end of every package post. The <code>#</code> is optional — spaces or
            commas both separate tags.
          </p>
        </div>
      </section>

      {saveError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </p>
      ) : null}

      {testResult ? (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            testResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {testResult.ok ? "Connection works — " : "Connection failed — "}
          {testResult.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {saving ? "Saving…" : "Save settings"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleTest()}
          disabled={testing || saving}
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {testing ? "Testing…" : "Test connection"}
        </Button>

        {savedAt && !tokenDraft && !clearToken ? (
          <span className="text-sm text-muted-foreground">Saved.</span>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        The test uses the <strong>saved</strong> settings, so save first if you have just pasted a
        token. It only reads the Page back — nothing is posted.
      </p>
    </form>
  )
}
