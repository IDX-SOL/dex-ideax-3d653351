import { useEffect } from "react";

const BACK_HIT_WIDTH_PX = 112;

/** Orderly sub-nav back is icon-only — add label + wider tap target. */
export function useSubNavBackAffordance() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("svg.oui-absolute.oui-start-6")) return;

      const bar = target.closest(
        ".oui-scaffold-topNavbar .oui-relative:has(> svg.oui-absolute.oui-start-6)",
      );
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      if (event.clientX - rect.left > BACK_HIT_WIDTH_PX) return;

      const backIcon = bar.querySelector("svg.oui-absolute.oui-start-6");
      backIcon?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
