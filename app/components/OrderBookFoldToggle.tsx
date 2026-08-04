import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useScreen } from "@orderly.network/ui";
import { useTradingMode } from "@/hooks/useTradingMode";
import { getStoredTradingMode } from "@/utils/trading-mode";

const STORAGE_KEY = "idx_dex_orderbook_folded";
const FOLDED_ATTR = "data-idx-orderbook-folded";
/** Mobile: fade book content before collapsing the column (avoids a hard jump). */
const FOLDING_ATTR = "data-idx-orderbook-folding";
const PANE_MARK = "idx-orderbook-pane";
const MOBILE_COL_MARK = "idx-orderbook-mobile-col";
const GAP_MARK = "idx-orderbook-fold-gap";
const HOST_CLASS = "idx-orderbook-fold-host";
/** Folded pane takes no width — arrow sits in the standard section gap. */
const FOLDED_WIDTH = "0px";
/** Match CSS width transition; delay moving the arrow into the gap. */
const FOLD_ANIM_MS = 220;
/** Mobile: fade content first, then collapse grid. */
const MOBILE_FADE_MS = 180;
const MOBILE_LAYOUT_MS = 340;

let mobileFoldTimer = 0;

function initialFolded(): boolean {
  // Lite starts folded; Pro starts with the order book open.
  return getStoredTradingMode() === "lite";
}

function writeFolded(folded: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, folded ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function applyFoldedClass(
  folded: boolean,
  isMobile = false,
  immediate = false,
) {
  const root = document.documentElement;
  window.clearTimeout(mobileFoldTimer);

  if (immediate || !isMobile || prefersReducedMotion()) {
    root.removeAttribute(FOLDING_ATTR);
    root.setAttribute(FOLDED_ATTR, folded ? "true" : "false");
    return;
  }

  if (folded) {
    // 1) Fade book content  2) collapse column after a short delay
    root.setAttribute(FOLDING_ATTR, "true");
    root.setAttribute(FOLDED_ATTR, "false");
    mobileFoldTimer = window.setTimeout(() => {
      root.setAttribute(FOLDED_ATTR, "true");
      mobileFoldTimer = window.setTimeout(() => {
        root.removeAttribute(FOLDING_ATTR);
      }, MOBILE_LAYOUT_MS);
    }, MOBILE_FADE_MS);
    return;
  }

  // Unfold: expand column first (content still faded), then fade content in
  root.setAttribute(FOLDING_ATTR, "true");
  root.setAttribute(FOLDED_ATTR, "false");
  mobileFoldTimer = window.setTimeout(() => {
    root.removeAttribute(FOLDING_ATTR);
  }, MOBILE_FADE_MS + 80);
}

function cleanupMarks() {
  document.querySelectorAll(`.${HOST_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`.${PANE_MARK}`).forEach((el) => {
    el.classList.remove(PANE_MARK);
    unlockPaneSize(el as HTMLElement);
  });
  document
    .querySelectorAll(`.${MOBILE_COL_MARK}`)
    .forEach((el) => el.classList.remove(MOBILE_COL_MARK));
  document
    .querySelectorAll(`.${GAP_MARK}`)
    .forEach((el) => el.classList.remove(GAP_MARK));
}

function findDesktopPane(): HTMLElement | null {
  const root = document.querySelector<HTMLElement>(
    ".oui-trading-orderBookAndTrades",
  );
  if (!root) return null;
  return (
    root.closest<HTMLElement>(".oui-trading-orderBook-container") ||
    root.parentElement
  );
}

/** Standard gap between chart column and settings (order entry) split bar. */
function findMainOrderEntrySplitBar(pane: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = pane;
  while (el) {
    const parent = el.parentElement;
    if (
      parent?.classList.contains("w-split") &&
      parent.classList.contains("w-split-horizontal") &&
      parent.classList.contains("oui-flex-1")
    ) {
      return parent.querySelector<HTMLElement>(":scope > .w-split-bar");
    }
    el = parent;
  }
  return document.querySelector<HTMLElement>(
    ".w-split.oui-flex-1.w-split-horizontal > .w-split-bar.w-split-line-bar",
  );
}

function findMobileBookCol(): HTMLElement | null {
  const root = document.querySelector<HTMLElement>(
    ".oui-trading-orderBookAndEntry",
  );
  if (!root) return null;
  return (
    ([...root.children] as HTMLElement[]).find(
      (child) => !child.querySelector(".oui-orderEntry"),
    ) ?? null
  );
}

function lockPaneSize(pane: HTMLElement) {
  pane.style.setProperty("width", FOLDED_WIDTH, "important");
  pane.style.setProperty("min-width", FOLDED_WIDTH, "important");
  pane.style.setProperty("max-width", FOLDED_WIDTH, "important");
  pane.style.setProperty("flex", `0 0 ${FOLDED_WIDTH}`, "important");
}

function unlockPaneSize(pane: HTMLElement) {
  pane.style.removeProperty("width");
  pane.style.removeProperty("min-width");
  pane.style.removeProperty("max-width");
  pane.style.removeProperty("flex");
}

function ensureHost(parent: HTMLElement): HTMLElement {
  if (getComputedStyle(parent).position === "static") {
    parent.style.position = "relative";
  }

  let host = parent.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
  if (!host) {
    // Reuse an existing host from another parent when possible (avoids remount flicker).
    const orphan = document.querySelector<HTMLElement>(`.${HOST_CLASS}`);
    if (orphan) {
      parent.appendChild(orphan);
      host = orphan;
    } else {
      host = document.createElement("div");
      host.className = HOST_CLASS;
      parent.appendChild(host);
    }
  }
  return host;
}

/** Pin folded arrow to the top of the chart row inside the section gap. */
function alignFoldHostToChartTop(host: HTMLElement, gap: HTMLElement) {
  const chart = document.querySelector<HTMLElement>(
    ".oui-trading-tradingview-container",
  );
  const top = chart
    ? chart.getBoundingClientRect().top - gap.getBoundingClientRect().top + 8
    : 8;
  host.style.setProperty(
    "top",
    `${Math.max(0, Math.round(top))}px`,
    "important",
  );
  host.style.setProperty("bottom", "auto", "important");
  host.style.setProperty("height", "auto", "important");
  host.style.setProperty("max-height", "none", "important");
  host.style.setProperty("inset", "auto", "important");
  // Re-apply top after clearing inset shorthand
  host.style.setProperty(
    "top",
    `${Math.max(0, Math.round(top))}px`,
    "important",
  );
  host.style.setProperty("left", "50%", "important");
}

function FoldChevron({ folded }: { folded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden
      className="oui-fill-base-contrast-54 group-hover:oui-fill-base-contrast-80"
    >
      {folded ? (
        <path d="M7.8 2.4a.6.6 0 0 0-.85 0L3.7 5.65a.6.6 0 0 0 0 .85l3.25 3.25a.6.6 0 1 0 .85-.85L5 6.07l2.8-2.82a.6.6 0 0 0 0-.85Z" />
      ) : (
        <path d="M4.2 2.4a.6.6 0 0 1 .85 0L8.3 5.65a.6.6 0 0 1 0 .85L5.05 9.75a.6.6 0 1 1-.85-.85L7 6.07 4.2 3.25a.6.6 0 0 1 0-.85Z" />
      )}
    </svg>
  );
}

/**
 * Fold control for the order book.
 * Expanded: top-right of the book (next to Last trades).
 * Folded (desktop): arrow sits in the standard chart↔settings gap; resize
 * handle below it stays separately draggable.
 */
export function OrderBookFoldToggle() {
  const { isMobile } = useScreen();
  const { isLite } = useTradingMode();
  const [folded, setFolded] = useState(initialFolded);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const skipMobileDelayRef = useRef(true);

  const toggle = useCallback(() => {
    setFolded((prev) => {
      const next = !prev;
      writeFolded(next);
      return next;
    });
  }, []);

  // Lite: fold order book (arrow stays). Pro: open order book.
  // Manual toggle still works in both modes via the arrow.
  useEffect(() => {
    const nextFolded = isLite;
    setFolded(nextFolded);
    writeFolded(nextFolded);
  }, [isLite]);

  useLayoutEffect(() => {
    const immediate = skipMobileDelayRef.current;
    skipMobileDelayRef.current = false;
    applyFoldedClass(folded, isMobile, immediate);
  }, [folded, isMobile]);

  // After the CSS width animation, lock folded size if the SDK fights layout.
  useLayoutEffect(() => {
    if (isMobile || !folded) {
      if (!isMobile) {
        document
          .querySelectorAll<HTMLElement>(
            `.oui-trading-orderBook-container, .${PANE_MARK}`,
          )
          .forEach(unlockPaneSize);
      }
      return;
    }

    let raf = 0;
    let lockTimer = 0;
    let mo: MutationObserver | null = null;
    const panes = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          ".oui-trading-orderBook-container",
        ),
        ...document.querySelectorAll<HTMLElement>(
          `.${PANE_MARK}:not(.oui-trading-orderBook-container)`,
        ),
      ].filter((el, i, arr) => arr.indexOf(el) === i);

    const lockAll = () => {
      for (const pane of panes()) lockPaneSize(pane);
    };
    const scheduleLock = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(lockAll);
    };

    const startGuarding = () => {
      lockAll();
      mo = new MutationObserver(scheduleLock);
      const observed = new WeakSet<HTMLElement>();
      for (const pane of panes()) {
        if (observed.has(pane)) continue;
        observed.add(pane);
        mo.observe(pane, {
          attributes: true,
          attributeFilter: ["style", "class"],
        });
      }
    };

    // Let CSS animate 280→0 first; then pin with inline lock.
    const delay = prefersReducedMotion() ? 0 : FOLD_ANIM_MS;
    lockTimer = window.setTimeout(startGuarding, delay);

    return () => {
      window.clearTimeout(lockTimer);
      cancelAnimationFrame(raf);
      mo?.disconnect();
      panes().forEach(unlockPaneSize);
    };
  }, [folded, isMobile]);

  useLayoutEffect(() => {
    let observer: MutationObserver | null = null;
    let delayTimer = 0;

    const clearGapMarks = () => {
      document
        .querySelectorAll(`.${GAP_MARK}`)
        .forEach((el) => el.classList.remove(GAP_MARK));
    };

    const placeHostOnPane = (pane: HTMLElement) => {
      clearGapMarks();
      pane.classList.add(PANE_MARK);
      const host = ensureHost(pane);
      host.style.removeProperty("top");
      host.style.removeProperty("bottom");
      host.style.removeProperty("left");
      host.style.removeProperty("inset");
      host.style.removeProperty("transform");
      setSlot((prev) => (prev === host ? prev : host));
      return true;
    };

    const placeHostOnGap = (pane: HTMLElement) => {
      lockPaneSize(pane);
      pane.classList.add(PANE_MARK);
      const gap = findMainOrderEntrySplitBar(pane);
      if (!gap) return placeHostOnPane(pane);
      clearGapMarks();
      gap.classList.add(GAP_MARK);
      const host = ensureHost(gap);
      alignFoldHostToChartTop(host, gap);
      setSlot((prev) => (prev === host ? prev : host));
      return true;
    };

    const attach = (): boolean => {
      if (isMobile) {
        document.querySelectorAll(`.${HOST_CLASS}`).forEach((el) => {
          if (!el.closest(`.${MOBILE_COL_MARK}`)) el.remove();
        });
        clearGapMarks();
        const col = findMobileBookCol();
        if (!col) {
          setSlot(null);
          return false;
        }
        col.classList.add(MOBILE_COL_MARK);
        const host = ensureHost(col);
        setSlot((prev) => (prev === host ? prev : host));
        return true;
      }

      const pane = findDesktopPane();
      if (!pane) {
        setSlot(null);
        return false;
      }

      window.clearTimeout(delayTimer);

      if (folded) {
        // Animate collapse with host still on the pane, then park arrow in the gap.
        placeHostOnPane(pane);
        const delay = prefersReducedMotion() ? 0 : FOLD_ANIM_MS;
        delayTimer = window.setTimeout(() => {
          placeHostOnGap(pane);
        }, delay);
        return true;
      }

      // Unfold: put arrow back on the pane immediately, then let width expand.
      return placeHostOnPane(pane);
    };

    const watch = () => {
      if (attach()) return;
      observer?.disconnect();
      observer = new MutationObserver(() => {
        if (attach()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    watch();

    const onResize = () => {
      if (!folded || isMobile) return;
      const gap = document.querySelector<HTMLElement>(`.${GAP_MARK}`);
      const host = gap?.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
      if (gap && host) alignFoldHostToChartTop(host, gap);
    };
    window.addEventListener("resize", onResize);

    const reconnect = window.setInterval(() => {
      const host = document.querySelector<HTMLElement>(`.${HOST_CLASS}`);
      if (!host?.isConnected) {
        watch();
      } else {
        onResize();
      }
    }, 1500);

    return () => {
      observer?.disconnect();
      window.clearTimeout(delayTimer);
      window.clearInterval(reconnect);
      window.removeEventListener("resize", onResize);
      cleanupMarks();
    };
  }, [isMobile, folded]);

  if (!slot?.isConnected) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="idx-orderbook-fold-btn group"
      aria-label={folded ? "Show order book" : "Hide order book"}
      aria-pressed={folded}
      title={folded ? "Show order book" : "Hide order book"}
      onClick={toggle}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <FoldChevron folded={folded} />
    </button>,
    slot,
  );
}
