import { useEffect, useRef } from "react";
import { FooterWidget, type FooterProps } from "@orderly.network/ui-scaffold";
import { IdxFooterCreditLink } from "@/components/IdxFooterCreditLink";

const ORDER_ENTRY_SELECTOR = ".oui-trading-orderEntry-container";

/** Orderly footer + right-side “by idxsolana.io” credit. */
export function IdxScaffoldFooter(props: FooterProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const sync = () => {
      const orderEntry = document.querySelector(ORDER_ENTRY_SELECTOR);
      if (!orderEntry) {
        shell.style.removeProperty("--idx-footer-by-right");
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const entryRect = orderEntry.getBoundingClientRect();
      const inset = Math.max(0, Math.round(shellRect.right - entryRect.right));
      shell.style.setProperty("--idx-footer-by-right", `${inset}px`);
    };

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(document.documentElement);

    let observedEntry: Element | null = null;
    const observeOrderEntry = () => {
      const orderEntry = document.querySelector(ORDER_ENTRY_SELECTOR);
      if (orderEntry === observedEntry) return;
      if (observedEntry) ro.unobserve(observedEntry);
      observedEntry = orderEntry;
      if (orderEntry) ro.observe(orderEntry);
    };
    observeOrderEntry();

    const mo = new MutationObserver(() => {
      observeOrderEntry();
      sync();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", sync);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div className="idx-footer-shell" ref={shellRef}>
      <FooterWidget {...props} />
      <IdxFooterCreditLink className="idx-footer-by" />
    </div>
  );
}
