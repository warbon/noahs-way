"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

/** Matches the loose checks the server applies, so the error appears here first. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function hasUsableDigits(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

export default function ContactFields({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_contact_form">) {
  const { prompt, prefill } = widget.payload
  const [name, setName] = useState(prefill?.name ?? "")
  const [mobile, setMobile] = useState(prefill?.mobile ?? "")
  const [email, setEmail] = useState(prefill?.email ?? "")
  const [touched, setTouched] = useState(false)

  const locked = disabled || answered
  const emailValid = EMAIL_PATTERN.test(email.trim())
  const mobileValid = hasUsableDigits(mobile)
  const valid = name.trim().length > 0 && emailValid && mobileValid

  return (
    <WidgetShell prompt={prompt} answered={answered}>
      <div className="space-y-2">
        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Full name
          <Input
            value={name}
            disabled={locked}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Mobile number
          <Input
            value={mobile}
            disabled={locked}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+63 917 000 0000"
            onChange={(event) => setMobile(event.target.value)}
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
          Email address
          <Input
            type="email"
            value={email}
            disabled={locked}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </div>

      {touched && !valid ? (
        <p className="mt-2 text-xs text-destructive">
          A consultant needs all three to reach you — please check the details above.
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={locked}
        onClick={() => {
          setTouched(true)
          if (!valid) return
          onSubmit({ name: name.trim(), mobile: mobile.trim(), email: email.trim() })
        }}
      >
        Continue
      </Button>
    </WidgetShell>
  )
}
