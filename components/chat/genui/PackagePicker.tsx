"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

/**
 * Every field here is resolved from the catalog server-side, so a card can
 * never advertise a price or duration the assistant invented.
 */
export default function PackagePicker({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_package_picker">) {
  const { intro, packages } = widget.payload

  return (
    <WidgetShell prompt={intro} answered={answered}>
      <ul className="space-y-2">
        {packages.map((pkg) => (
          <li
            key={pkg.id}
            className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 p-2"
          >
            <Image
              src={pkg.previewImage}
              alt={pkg.imageAlt}
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{pkg.title}</p>
              <p className="text-xs text-muted-foreground">
                {[pkg.durationLabel, pkg.priceLabel].filter(Boolean).join(" • ")}
              </p>
              {pkg.summary ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pkg.summary}</p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || answered}
                  onClick={() => onSubmit({ packageId: pkg.id, title: pkg.title })}
                >
                  Choose this
                </Button>
                <a
                  href={pkg.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View details
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
