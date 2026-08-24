import { useEffect } from "react";
import { useNav } from "@/hooks/useNav";

/** Orderly portfolio cards only wire onClick to the chevron icon — expand hit area. */
export function usePortfolioOverviewCardClicks(enabled = true) {
  const { onRouteChange } = useNav();

  useEffect(() => {
    if (!enabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const affiliateRow = target.closest(
        ".oui-portfolio-page .oui-portfolio-affiliate-card .oui-mt-auto.oui-w-full",
      );
      if (
        affiliateRow &&
        !target.closest(".oui-portfolio-affiliate-card svg.oui-ms-auto")
      ) {
        onRouteChange({
          href: "/rewards/affiliate?tab=affiliate",
          name: "Rewards",
        });
        return;
      }

      const traderRow = target.closest(
        ".oui-portfolio-page .oui-portfolio-trader-card .oui-mt-auto.oui-w-full",
      );
      if (
        traderRow &&
        !target.closest(".oui-portfolio-trader-card svg.oui-ms-auto")
      ) {
        onRouteChange({
          href: "/rewards/affiliate?tab=trader",
          name: "Rewards",
        });
        return;
      }

      const historyAction = target.closest(
        ".oui-portfolio-page .oui-gap-3.oui-bg-transparent > .oui-flex-1.oui-cursor-pointer:last-child",
      );
      const historyIcon = historyAction?.querySelector(
        'div[class*="oui-size-[48px]"]',
      );
      if (historyAction && historyIcon && !historyIcon.contains(target)) {
        onRouteChange({ href: "/portfolio/history", name: "History" });
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled, onRouteChange]);
}
