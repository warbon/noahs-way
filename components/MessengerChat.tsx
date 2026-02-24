"use client"

import { useEffect } from "react"
import Script from "next/script"

const FACEBOOK_PAGE_ID = "641987185655348"

declare global {
  interface Window {
    FB?: {
      init: (args: { xfbml: boolean; version: string }) => void
      XFBML?: {
        parse: () => void
      }
    }
    fbAsyncInit?: () => void
  }
}

export default function MessengerChat() {
  useEffect(() => {
    const chatbox = document.getElementById("fb-customer-chat")
    if (chatbox) {
      chatbox.setAttribute("page_id", FACEBOOK_PAGE_ID)
      chatbox.setAttribute("attribution", "biz_inbox")
      chatbox.setAttribute("theme_color", "#0084ff")
    }
  }, [])

  return (
    <>
      <div id="fb-root" />
      <div id="fb-customer-chat" className="fb-customerchat" />
      <Script id="fb-chat-init" strategy="afterInteractive">
        {`
          window.fbAsyncInit = function () {
            if (!window.FB) return;
            window.FB.init({
              xfbml: true,
              version: "v19.0"
            });
            window.FB.XFBML.parse();
          };
        `}
      </Script>
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js"
        onLoad={() => window.FB?.XFBML?.parse()}
      />
    </>
  )
}
