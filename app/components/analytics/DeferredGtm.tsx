import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { stripBasePath } from "@/utils/seo-routes";

const GTM_ID = "GTM-N5DRLDC5";

declare global {
  interface Window {
    __idxGtmLoaded?: boolean;
    dataLayer?: Record<string, unknown>[];
  }
}

function injectGtm() {
  if (typeof window === "undefined") return;
  if (window.__idxGtmLoaded) return;
  window.__idxGtmLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

/** Home marketing page — defer GTM until interaction (Lighthouse scroll must not trigger tags). */
function isPerfSensitiveHomePath(pathname: string): boolean {
  const basePath = import.meta.env.BASE_URL || "/";
  return stripBasePath(pathname, basePath) === "/";
}

/**
 * Loads GTM (and container tags such as Clarity / Ads) after first paint.
 * Home: interaction only. App routes: interaction, scroll, or 5s fallback.
 */
export default function DeferredGtm() {
  const { pathname } = useLocation();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;

    const load = () => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      injectGtm();
    };

    const marketingHome = isPerfSensitiveHomePath(pathname);
    const opts = { once: true, passive: true } as const;

    document.addEventListener("pointerdown", load, opts);
    document.addEventListener("keydown", load, opts);
    document.addEventListener("touchstart", load, opts);

    if (!marketingHome) {
      document.addEventListener("scroll", load, opts);
    }

    const timeoutId = marketingHome ? null : window.setTimeout(load, 5000);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", load);
      document.removeEventListener("keydown", load);
      document.removeEventListener("touchstart", load);
      document.removeEventListener("scroll", load);
    };
  }, [pathname]);

  return null;
}
