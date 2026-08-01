"use client";

import { useEffect } from "react";

const ADSENSE_CLIENT_ID = "ca-pub-4006284492158024";
const ADSENSE_SCRIPT_ID = "google-adsense";

export function LandingAdsenseLoader() {
  useEffect(() => {
    let timeoutId: number | null = null;

    const injectScript = () => {
      if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.id = ADSENSE_SCRIPT_ID;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      document.head.appendChild(script);
    };

    const scheduleScript = () => {
      timeoutId = window.setTimeout(injectScript, 0);
    };

    if (document.readyState === "complete") scheduleScript();
    else window.addEventListener("load", scheduleScript, { once: true });

    return () => {
      window.removeEventListener("load", scheduleScript);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
