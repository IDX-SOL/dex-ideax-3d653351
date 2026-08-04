import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@orderly.network/ui";

type FiberNode = {
  memoizedProps?: Record<string, unknown>;
  pendingProps?: Record<string, unknown>;
  return?: FiberNode | null;
  child?: FiberNode | null;
  sibling?: FiberNode | null;
};

function getFiber(node: Element | null): FiberNode | null {
  if (!node) return null;
  const key = Object.keys(node).find(
    (k) =>
      k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  return key
    ? ((node as unknown as Record<string, FiberNode>)[key] ?? null)
    : null;
}

function findOnOpenChange(
  start: Element | null,
): ((open: boolean) => void) | null {
  let fiber: FiberNode | null = getFiber(start);
  let fallback: ((open: boolean) => void) | null = null;

  for (let i = 0; fiber && i < 80; i += 1, fiber = fiber.return ?? null) {
    const props = fiber.memoizedProps ?? fiber.pendingProps;
    const onOpenChange = props?.onOpenChange;
    if (typeof onOpenChange !== "function" || !props || !("open" in props)) {
      continue;
    }
    // Prefer Orderly SimpleSheet props (owns openMarketsSheet state)
    if ("classNames" in props || "contentProps" in props) {
      return onOpenChange as (open: boolean) => void;
    }
    if (!fallback) {
      fallback = onOpenChange as (open: boolean) => void;
    }
  }

  return fallback;
}

function dismissViaOverlay(dialog: Element) {
  const portal = dialog.parentElement;
  const overlay =
    portal?.querySelector<HTMLElement>(".oui-sheet-overlay") ??
    document.querySelector<HTMLElement>(
      ".oui-sheet-overlay[data-state='open']",
    );

  if (!overlay) return false;

  // Click outside the left drawer (right side of the dimmed overlay)
  const x = Math.min(
    window.innerWidth - 8,
    overlay.getBoundingClientRect().right - 8,
  );
  const y = Math.round(overlay.getBoundingClientRect().height / 2);
  const opts: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
  };

  overlay.dispatchEvent(new PointerEvent("pointerdown", opts));
  overlay.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    }),
  );
  overlay.click();
  return true;
}

function closeMarketsSheet() {
  const sheet = document.querySelector(".oui-markets-marketsSheet");
  if (!sheet) return;

  const dialog =
    sheet.closest('[role="dialog"]') ??
    sheet.closest(".oui-sheet-content") ??
    sheet;

  const onOpenChange = findOnOpenChange(dialog as Element);
  if (onOpenChange) {
    onOpenChange(false);
    return;
  }

  dismissViaOverlay(dialog);
}

/**
 * Orderly mobile Markets SimpleSheet sets closeable:false.
 * Inject X on the same row as the "Markets" title.
 */
export function MarketsSheetCloseButton() {
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => {
      setHost(document.querySelector(".oui-marketsSheet-header"));
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    return () => observer.disconnect();
  }, []);

  if (!host) return null;

  return createPortal(
    <button
      type="button"
      className="idx-markets-sheet-close"
      aria-label="Close markets"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMarketsSheet();
      }}
    >
      <CloseIcon size={18} color="white" opacity={0.8} />
    </button>,
    host,
  );
}
