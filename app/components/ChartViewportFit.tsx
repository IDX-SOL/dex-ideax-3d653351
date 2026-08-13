import { useEffect } from "react";

const FS_STYLE_PROPS = [
  "position",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "max-width",
  "max-height",
  "min-width",
  "min-height",
  "z-index",
  "box-sizing",
  "overflow",
] as const;

function setStyle(el: HTMLElement, prop: string, value: string) {
  if (el.style.getPropertyValue(prop) === value) return;
  el.style.setProperty(prop, value);
}

function clearStyles(el: HTMLElement, props: readonly string[]) {
  for (const prop of props) {
    if (el.style.getPropertyValue(prop)) {
      el.style.removeProperty(prop);
    }
  }
}

function isChartFullscreen(el: HTMLElement): boolean {
  if (localStorage.getItem("orderly:tradingview-fullscreen") === "true") {
    return true;
  }
  const cls = el.className || "";
  return (
    cls.includes("oui-z-40") ||
    cls.includes("!oui-absolute") ||
    /(^|\s)oui-absolute(\s|$)/.test(cls)
  );
}

const MOBILE_H_KEY = "idx_mobile_tv_height";
const MOBILE_H_MIN = 234;
const MOBILE_H_MAX = 354;

function isDesktop() {
  return window.matchMedia("(min-width: 1280px)").matches;
}

function readMobileChartHeight(): number {
  const raw = Number(
    localStorage.getItem(MOBILE_H_KEY) ??
      localStorage.getItem("TRADINGVIEW_MOBILE_HEIGHT"),
  );
  if (!Number.isFinite(raw)) return MOBILE_H_MAX;
  return Math.min(MOBILE_H_MAX, Math.max(MOBILE_H_MIN, Math.round(raw)));
}

function writeMobileChartHeight(h: number) {
  const next = String(h);
  localStorage.setItem(MOBILE_H_KEY, next);
  localStorage.setItem("TRADINGVIEW_MOBILE_HEIGHT", next);
}

/**
 * Mobile topTab chart: Orderly drag is touch-only and was capped ~32vh.
 * Drive height ourselves (234–354) so the stretch bar works with finger or mouse.
 */
function fitMobileChart() {
  if (typeof window === "undefined") return;
  if (isDesktop()) return;

  const tv = document.querySelector<HTMLElement>(
    ".oui-trading-topTab .oui-trading-tradingview",
  );
  if (!tv) return;

  const h = readMobileChartHeight();
  setStyle(tv, "height", `${h}px`);
  setStyle(tv, "max-height", "none");

  const drag = tv.querySelector<HTMLElement>(".oui-absolute.oui-z-10");
  if (!drag || drag.dataset.idxStretchBound === "1") return;
  drag.dataset.idxStretchBound = "1";

  let dragging = false;
  let pointerId: number | null = null;
  let top = 0;
  let offset = 0;

  const endDrag = (e?: PointerEvent) => {
    const id = e?.pointerId ?? pointerId;
    dragging = false;
    pointerId = null;
    if (id != null && drag.hasPointerCapture(id)) {
      drag.releasePointerCapture(id);
    }
  };

  const onDown = (e: PointerEvent) => {
    if (e.button != null && e.button !== 0) return;
    const rect = tv.getBoundingClientRect();
    dragging = true;
    pointerId = e.pointerId;
    top = rect.top;
    offset = e.clientY - rect.bottom;
    drag.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const next = Math.min(
      MOBILE_H_MAX,
      Math.max(MOBILE_H_MIN, Math.round(e.clientY - top - offset)),
    );
    writeMobileChartHeight(next);
    setStyle(tv, "height", `${next}px`);
    e.preventDefault();
    e.stopPropagation();
  };

  drag.style.touchAction = "none";
  drag.addEventListener("pointerdown", onDown);
  drag.addEventListener("pointermove", onMove);
  drag.addEventListener("pointerup", endDrag);
  drag.addEventListener("pointercancel", endDrag);
  drag.addEventListener("lostpointercapture", endDrag);
}
function fitTradingShell() {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(min-width: 1280px)").matches) return;

  const shells = document.querySelectorAll<HTMLElement>(
    '.oui-scaffold-container [class*="100vh_-_48px_-_29px"], .oui-scaffold-container [class*="100vh-80px"]',
  );
  shells.forEach((el) => {
    setStyle(el, "min-width", "0px");
    setStyle(el, "max-width", "100%");
    setStyle(el, "width", "100%");
  });

  document
    .querySelectorAll<HTMLElement>(
      ".oui-scaffold-container .w-split.oui-flex-1, .oui-scaffold-container .oui-justify-start",
    )
    .forEach((el) => {
      if (el.style.minWidth && el.style.minWidth !== "0px") {
        setStyle(el, "min-width", "0px");
      }
    });

  let notifyResize = false;
  document
    .querySelectorAll<HTMLElement>(".oui-tradingview-root")
    .forEach((el) => {
      if (!isChartFullscreen(el)) {
        const hadOverlay = Boolean(el.style.position || el.style.width);
        clearStyles(el, FS_STYLE_PROPS);
        if (hadOverlay) notifyResize = true;
        return;
      }
      const wasPinned = el.style.position === "fixed";
      setStyle(el, "position", "fixed");
      setStyle(el, "top", "48px");
      setStyle(el, "right", "0px");
      setStyle(el, "bottom", "29px");
      setStyle(el, "left", "0px");
      el.style.removeProperty("inset");
      setStyle(el, "height", "auto");
      setStyle(el, "max-height", "none");
      setStyle(el, "width", "auto");
      setStyle(el, "max-width", "100%");
      setStyle(el, "min-width", "0px");
      setStyle(el, "min-height", "0px");
      setStyle(el, "overflow", "hidden");
      setStyle(el, "z-index", "40");
      setStyle(el, "box-sizing", "border-box");
      if (!wasPinned) notifyResize = true;
    });

  if (notifyResize) {
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }
}

export function ChartViewportFit() {
  useEffect(() => {
    let scheduled = 0;
    const run = () => {
      if (scheduled) return;
      scheduled = window.requestAnimationFrame(() => {
        scheduled = 0;
        fitTradingShell();
        fitMobileChart();
      });
    };

    run();
    window.addEventListener("resize", run);
    window.addEventListener("storage", run);

    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem(key, value);
      if (key.includes("fullscreen")) {
        run();
      }
    };

    const obs = new MutationObserver(run);
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      window.removeEventListener("resize", run);
      window.removeEventListener("storage", run);
      localStorage.setItem = originalSetItem;
      obs.disconnect();
      if (scheduled) window.cancelAnimationFrame(scheduled);
    };
  }, []);

  return null;
}
