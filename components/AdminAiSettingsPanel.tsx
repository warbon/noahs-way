"use client"

import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AI_PROVIDER_LABELS,
  AI_PROVIDER_NAMES,
  DEFAULT_AI_MODELS,
  SUGGESTED_AI_MODELS,
  type AiProviderName
} from "@/lib/ai/models"
import type { PublicAiSettings } from "@/lib/ai/settings-types"
import { cn } from "@/lib/utils"

type ProviderChoice = AiProviderName | "auto"

type PerProvider<T> = Record<AiProviderName, T>

type TestResult = { ok: boolean; message: string }

const keySourceLabels: Record<PublicAiSettings["resolved"]["keySource"], string> = {
  settings: "the key saved here",
  env: "an environment variable",
  none: "no key at all"
}

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

function emptyPerProvider(): PerProvider<string> {
  return { anthropic: "", openai: "" }
}

export default function AdminAiSettingsPanel() {
  const [settings, setSettings] = useState<PublicAiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(true)
  const [provider, setProvider] = useState<ProviderChoice>("auto")
  const [models, setModels] = useState<PerProvider<string>>(emptyPerProvider)
  // Blank means "leave the stored key alone" — the panel can never read one
  // back, so it must not be able to overwrite one by accident.
  const [keyDrafts, setKeyDrafts] = useState<PerProvider<string>>(emptyPerProvider)
  const [clearedKeys, setClearedKeys] = useState<PerProvider<boolean>>({
    anthropic: false,
    openai: false
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const applySettings = useCallback((next: PublicAiSettings) => {
    setSettings(next)
    setEnabled(next.enabled)
    setProvider(next.provider ?? "auto")
    setModels({ anthropic: next.anthropic.model ?? "", openai: next.openai.model ?? "" })
    setKeyDrafts(emptyPerProvider())
    setClearedKeys({ anthropic: false, openai: false })
  }, [])

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/admin/ai-settings", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as {
        settings?: PublicAiSettings
      } | null

      if (!response.ok || !payload?.settings) {
        setLoadError(getApiErrorMessage(payload) ?? "Could not load assistant settings.")
        return
      }

      applySettings(payload.settings)
    } catch {
      setLoadError("Could not load assistant settings.")
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
      provider: provider === "auto" ? null : provider
    }

    for (const name of AI_PROVIDER_NAMES) {
      const patch: Record<string, unknown> = { model: models[name].trim() || null }
      const draft = keyDrafts[name].trim()

      if (draft) patch.apiKey = draft
      else if (clearedKeys[name]) patch.apiKey = null

      body[name] = patch
    }

    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const payload = (await response.json().catch(() => null)) as {
        settings?: PublicAiSettings
      } | null

      if (!response.ok || !payload?.settings) {
        setSaveError(getApiErrorMessage(payload) ?? "Could not save assistant settings.")
        return
      }

      applySettings(payload.settings)
      setSavedAt(Date.now())
    } catch {
      setSaveError("Could not save assistant settings.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch("/api/admin/ai-settings/test", { method: "POST" })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        provider?: string
        model?: string
        error?: string
      } | null

      if (!response.ok || !payload) {
        setTestResult({ ok: false, message: getApiErrorMessage(payload) ?? "The test could not run." })
        return
      }

      setTestResult(
        payload.ok
          ? { ok: true, message: `${payload.provider} answered using ${payload.model}.` }
          : { ok: false, message: payload.error ?? "The provider rejected the request." }
      )
    } catch {
      setTestResult({ ok: false, message: "The test could not run." })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/15 bg-white p-6 text-sm text-muted-foreground shadow-sm">
        Loading assistant settings…
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>{loadError ?? "Could not load assistant settings."}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void loadSettings()}>
          Try again
        </Button>
      </div>
    )
  }

  const { resolved } = settings
  const hasUnsavedKey = AI_PROVIDER_NAMES.some(
    (name) => keyDrafts[name].trim() !== "" || clearedKeys[name]
  )

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
            ? "The assistant is live on the website"
            : "The assistant is not running — visitors see the Messenger button"}
        </p>
        <p className="mt-2 text-sm">
          {resolved.keySource === "none" ? (
            <>
              No API key is configured for{" "}
              <strong>{AI_PROVIDER_LABELS[resolved.provider]}</strong> yet.
            </>
          ) : (
            <>
              Using <strong>{AI_PROVIDER_LABELS[resolved.provider]}</strong> with model{" "}
              <strong>{resolved.model}</strong>, authenticated by{" "}
              {keySourceLabels[resolved.keySource]}.
            </>
          )}
        </p>
        {!settings.enabled ? (
          <p className="mt-2 text-sm">
            The assistant ships switched off, so a key on its own never puts it in front of
            customers. Tick <strong>Enable the AI chat assistant</strong> below and save to
            put it live.
          </p>
        ) : null}
        {resolved.storedKeyUnreadable ? (
          <p className="mt-2 text-sm">
            The saved {AI_PROVIDER_LABELS[resolved.provider]} key could not be decrypted — this
            happens when <code>ADMIN_SESSION_SECRET</code> changes. Enter the key again below.
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
            <span className="block text-sm font-medium">Enable the AI chat assistant</span>
            <span className="block text-sm text-muted-foreground">
              Turning this off hides the chat launcher and stops the chat API, without touching the
              saved keys. Conversations already open stop at their next message.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <label htmlFor="ai-provider" className="text-sm font-medium">
            Provider
          </label>
          <select
            id="ai-provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ProviderChoice)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="auto">Automatic — whichever has a key</option>
            {AI_PROVIDER_NAMES.map((name) => (
              <option key={name} value={name}>
                {AI_PROVIDER_LABELS[name]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {AI_PROVIDER_NAMES.map((name) => {
        const stored = settings[name]
        const isActive = resolved.provider === name

        return (
          <section
            key={name}
            className="space-y-4 rounded-2xl border border-primary/15 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-primary">{AI_PROVIDER_LABELS[name]}</h2>
              {isActive ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  In use
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor={`${name}-key`} className="text-sm font-medium">
                API key
              </label>
              <Input
                id={`${name}-key`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={keyDrafts[name]}
                onChange={(event) => {
                  const value = event.target.value
                  setKeyDrafts((current) => ({ ...current, [name]: value }))
                  if (value) setClearedKeys((current) => ({ ...current, [name]: false }))
                }}
                placeholder={stored.hasStoredKey ? "Enter a new key to replace the saved one" : "Paste the API key"}
              />
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                {clearedKeys[name] ? (
                  <span className="text-amber-700">Key will be removed when you save.</span>
                ) : stored.hasStoredKey ? (
                  <>
                    <span>
                      Saved key ending <code>{stored.keyPreview ?? "????"}</code>, encrypted at rest.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClearedKeys((current) => ({ ...current, [name]: true }))
                        setKeyDrafts((current) => ({ ...current, [name]: "" }))
                      }}
                      className="font-medium text-destructive underline-offset-4 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                ) : stored.hasEnvKey ? (
                  <span>
                    No key saved here — falling back to the{" "}
                    <code>{name === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}</code>{" "}
                    environment variable.
                  </span>
                ) : (
                  <span>No key configured.</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${name}-model`} className="text-sm font-medium">
                Model
              </label>
              <Input
                id={`${name}-model`}
                list={`${name}-model-options`}
                autoComplete="off"
                spellCheck={false}
                value={models[name]}
                onChange={(event) => {
                  const value = event.target.value
                  setModels((current) => ({ ...current, [name]: value }))
                }}
                placeholder={DEFAULT_AI_MODELS[name]}
              />
              <datalist id={`${name}-model-options`}>
                {SUGGESTED_AI_MODELS[name].map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <p className="text-sm text-muted-foreground">
                Leave blank to use <code>{DEFAULT_AI_MODELS[name]}</code>. Any model id the provider
                accepts works — the list is only a shortcut.
              </p>
            </div>
          </section>
        )
      })}

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

        <Button type="button" variant="outline" onClick={() => void handleTest()} disabled={testing || saving}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {testing ? "Testing…" : "Test connection"}
        </Button>

        {savedAt && !hasUnsavedKey ? (
          <span className="text-sm text-muted-foreground">Saved.</span>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        The connection test uses the <strong>saved</strong> settings, so save first if you have just
        pasted a key. It sends one very small message and costs a fraction of a cent.
      </p>
    </form>
  )
}
