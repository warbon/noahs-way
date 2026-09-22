"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

/**
 * Every field here is resolved from the catalog server-side, so a card can
 * never advertise a rate or a capacity the assistant invented.
 */
export default function StayPicker({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_stay_picker">) {
  const { intro, stays } = widget.payload

  return (
    <WidgetShell prompt={intro} answered={answered}>
      <ul className="space-y-2">
        {stays.map((stay) => (
          <li
            key={stay.id}
            className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 p-2"
          >
            <Image
              src={stay.previewImage}
              alt={stay.imageAlt}
              width={72}
              height={72}
              className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{stay.title}</p>
              <p className="text-xs text-muted-foreground">
                {[stay.rateLabel, stay.layoutLabel].filter(Boolean).join(" • ")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {stay.building ? `${stay.city} — ${stay.building}` : stay.city}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled || answered}
                  onClick={() => onSubmit({ stayId: stay.id, title: stay.title })}
                >
                  Choose this
                </Button>
                <a
                  href={stay.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  View unit
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
