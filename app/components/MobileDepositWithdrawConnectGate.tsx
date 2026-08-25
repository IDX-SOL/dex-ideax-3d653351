import { useEffect } from "react";
import { useAccount } from "@orderly.network/hooks";
import { useAppContext } from "@orderly.network/react-app";
import { AccountStatusEnum } from "@orderly.network/types";
import { useScreen } from "@orderly.network/ui";
import { triggerHeaderConnect } from "../utils/triggerHeaderConnect";

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** Left column (symbol, leverage, icon) — open markets sheet without wallet. */
function isSymbolMarketPicker(target: HTMLElement): boolean {
  const host = target.closest(
    ".oui-symbol-info-bar-mobile .oui-flex-1.oui-overflow-hidden",
  );
  if (!host) return false;

  const symbolColumn = host.querySelector(":scope > .oui-gap-x-3");
  return Boolean(symbolColumn?.contains(target));
}

function openMobileMarketsPicker(host: Element) {
  host
    .querySelector<HTMLElement>(".oui-h-5.oui-cursor-pointer")
    ?.click();
}

/**
 * While disconnected:
 * - Mobile/tablet: symbol bar (SOL / leverage) → markets sheet (no wallet)
 * - Mobile/tablet: Deposit / Withdraw trailing → header Connect wallet
 * - All viewports: Buy / Long | Sell / Short submit → header Connect wallet
 */
export function MobileDepositWithdrawConnectGate() {
  const { isMobile } = useScreen();
  const { state } = useAccount();
  const { connectWallet, disabledConnect } = useAppContext();
  const disconnected =
    disabledConnect || state.status <= AccountStatusEnum.NotConnected;

  useEffect(() => {
    if (!disconnected) return;

    const onPointerDownCapture = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Buy / Long | Sell / Short — button is disabled when !canTrade, so hit-test
      const submitBtn = document.getElementById("order-entry-submit-button");
      if (
        submitBtn &&
        pointInRect(
          event.clientX,
          event.clientY,
          submitBtn.getBoundingClientRect(),
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        triggerHeaderConnect(connectWallet);
        return;
      }

      if (!isMobile) return;

      // Keep eye toggle working
      if (target.closest(".oui-symbol-info-bar-mobile button.oui-px-1")) {
        return;
      }

      if (isSymbolMarketPicker(target)) {
        const host = target.closest(
          ".oui-symbol-info-bar-mobile .oui-flex-1.oui-overflow-hidden",
        );
        if (
          host &&
          !target.closest(".oui-symbol-info-bar-mobile .oui-h-5.oui-cursor-pointer")
        ) {
          openMobileMarketsPicker(host);
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      const trail = target.closest(
        ".oui-symbol-info-bar-mobile .oui-cursor-pointer",
      );
      if (!trail) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      triggerHeaderConnect(connectWallet);
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [isMobile, disconnected, connectWallet]);

  return null;
}
