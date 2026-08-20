"use client"

import { Button } from "@/components/ui/button"
import WidgetShell from "@/components/chat/genui/WidgetShell"
import type { GenUiComponentProps } from "@/lib/ai/genui-types"

export default function QuickReplies({
  widget,
  answered,
  disabled,
  onSubmit
}: GenUiComponentProps<"show_quick_replies">) {
  const { prompt, options } = widget.payload

  return (
    <WidgetShell prompt={prompt} answered={answered}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || answered}
            onClick={() => onSubmit({ choice: option })}
          >
            {option}
          </Button>
        ))}
      </div>
    </WidgetShell>
  )
}
