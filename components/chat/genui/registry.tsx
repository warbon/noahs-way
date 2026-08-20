"use client"

import type { JSX } from "react"

import BookingSummary from "@/components/chat/genui/BookingSummary"
import ContactFields from "@/components/chat/genui/ContactFields"
import PackagePicker from "@/components/chat/genui/PackagePicker"
import QuickReplies from "@/components/chat/genui/QuickReplies"
import TravelDatePicker from "@/components/chat/genui/TravelDatePicker"
import TravellerSelector from "@/components/chat/genui/TravellerSelector"
import type { GenUiComponentProps, GenUiToolName } from "@/lib/ai/genui-types"

/**
 * The whitelist.
 *
 * The assistant chooses a tool name; this decides what that name is allowed to
 * draw. Nothing the model writes reaches the DOM as markup, and a name that is
 * not a key here renders nothing at all.
 */
const registry: {
  [K in GenUiToolName]: (props: GenUiComponentProps<K>) => JSX.Element
} = {
  show_package_picker: PackagePicker,
  show_travel_date_picker: TravelDatePicker,
  show_traveller_selector: TravellerSelector,
  show_contact_form: ContactFields,
  show_booking_summary: BookingSummary,
  show_quick_replies: QuickReplies
}

export default function GenUiWidgetView(props: GenUiComponentProps) {
  const Component = registry[props.widget.name]
  if (!Component) return null

  // The widget and its handler are correlated by name in GenUiComponentProps,
  // but TypeScript cannot see that through the lookup — one cast, here, rather
  // than `any` spread across six components.
  const Renderer = Component as (props: GenUiComponentProps) => JSX.Element
  return <Renderer {...props} />
}
