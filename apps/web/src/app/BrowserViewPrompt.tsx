"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "snowaz-browser-prompt-v1";
const IN_APP_BROWSER = /FBAN|FBAV|Instagram|Messenger|Line\/|; wv\)|WebView/i;

export default function BrowserViewPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 850px)").matches;
    const isEmbedded = IN_APP_BROWSER.test(navigator.userAgent);
    setVisible((isMobile || isEmbedded) && sessionStorage.getItem(DISMISSED_KEY) !== "1");
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return <aside className="browser-view-prompt" role="dialog" aria-label="Open SnowAZ in your browser">
    <div><strong>For a better view</strong><span>Open SnowAZ in Chrome, Safari, or your preferred browser.</span></div>
    <div className="browser-view-actions"><button type="button" onClick={()=>window.open(window.location.href,"_blank","noopener,noreferrer")}>Open in browser</button><button type="button" onClick={dismiss}>Not now</button></div>
  </aside>;
}
