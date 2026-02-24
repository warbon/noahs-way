"use client"

import { FormEvent, startTransition, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type UploadState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

function getErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null

  const record = value as Record<string, unknown>
  return typeof record.error === "string" ? record.error : null
}

export default function AdminPackageUploadForm({
  onUploaded
}: {
  onUploaded?: () => void
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setUploadState({ status: "submitting" })

    try {
      const response = await fetch("/api/admin/packages", {
        method: "POST",
        body: formData
      })

      const payload = (await response.json().catch(() => null)) as unknown

      if (!response.ok) {
        setUploadState({
          status: "error",
          message: getErrorMessage(payload) ?? "Upload failed. Please try again."
        })
        return
      }

      const packageTitle =
        payload &&
        typeof payload === "object" &&
        "package" in payload &&
        payload.package &&
        typeof payload.package === "object" &&
        "title" in payload.package &&
        typeof payload.package.title === "string"
          ? payload.package.title
          : "Package"

      formRef.current?.reset()
      setUploadState({
        status: "success",
        message: `${packageTitle} uploaded successfully.`
      })

      startTransition(() => {
        router.refresh()
      })
      onUploaded?.()
    } catch {
      setUploadState({
        status: "error",
        message: "Network error while uploading. Please try again."
      })
    }
  }

  const isSubmitting = uploadState.status === "submitting"

  return (
    <section className="rounded-2xl border border-primary/15 bg-white p-6 shadow-xl shadow-primary/10">
      <h2 className="text-lg font-semibold text-primary">New Package</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload an image and save package details to local JSON storage.
      </p>

      {uploadState.status === "success" ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {uploadState.message}
        </p>
      ) : null}

      {uploadState.status === "error" ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadState.message}
        </p>
      ) : null}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="mt-6 grid gap-4 md:grid-cols-2"
        encType="multipart/form-data"
      >
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue="local"
            disabled={isSubmitting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="local">Local</option>
            <option value="international">International</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="price" className="text-sm font-medium text-foreground">
            Price
          </label>
          <Input
            id="price"
            name="price"
            placeholder="from PHP 24,900"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <Input
            id="title"
            name="title"
            placeholder="Boracay Luxe Escape"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="details" className="text-sm font-medium text-foreground">
            Details
          </label>
          <Textarea
            id="details"
            name="details"
            placeholder="4 Days / 3 Nights • Beachfront resort • Island hopping"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="image" className="text-sm font-medium text-foreground">
            Package image
          </label>
          <Input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">Allowed: JPG, PNG, WEBP up to 8MB.</p>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? "Uploading..." : "Upload Package"}
          </Button>
        </div>
      </form>
    </section>
  )
}
