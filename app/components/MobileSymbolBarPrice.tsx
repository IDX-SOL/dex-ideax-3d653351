import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTickerStream, useSymbolsInfo } from "@orderly.network/hooks";
import { Text, useScreen } from "@orderly.network/ui";

const PRICE_CLASS = "idx-mobile-symbol-price";
const HOST_MARK = "idx-mobile-symbol-price-host";

function getHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    ".oui-symbol-info-bar-mobile .oui-flex-1.oui-overflow-hidden",
  );
}

function findPercentEl(host: HTMLElement): HTMLElement | null {
  return (
    host.querySelector<HTMLElement>(
      `:scope > span.oui-text-2xs.oui-tabular-nums`,
    ) ||
    host.querySelector<HTMLElement>(`:scope > span.oui-tabular-nums`) ||
    host.querySelector<HTMLElement>(`:scope > span.oui-text-2xs`)
  );
}

function cleanupMobilePrice() {
  document.querySelectorAll(`.${PRICE_CLASS}`).forEach((el) => el.remove());
  document
    .querySelectorAll(`.${HOST_MARK}`)
    .forEach((el) => el.classList.remove(HOST_MARK));
}

/**
 * Mobile-only live last price above the SDK 24h %.
 * Price updates via React (same useTickerStream as desktop) — slot attach
 * is separate and does not re-run on every tick.
 */
export function MobileSymbolBarPrice({ symbol }: { symbol: string }) {
  const { isMobile } = useScreen();
  const ticker = useTickerStream(symbol);
  const symbolsInfo = useSymbolsInfo();
  const quoteDp = symbolsInfo[symbol]?.("quote_dp") ?? 2;
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!isMobile) {
      cleanupMobilePrice();
      setSlot(null);
      return;
    }

    let observer: MutationObserver | null = null;

    const attach = (): boolean => {
      const host = getHost();
      const percentEl = host ? findPercentEl(host) : null;
      if (!host || !percentEl) {
        setSlot(null);
        return false;
      }

      host.classList.add(HOST_MARK);

      let el = host.querySelector<HTMLElement>(`:scope > .${PRICE_CLASS}`);
      if (!el) {
        el = document.createElement("span");
        el.className = PRICE_CLASS;
        host.insertBefore(el, percentEl);
      } else if (el.nextElementSibling !== percentEl) {
        host.insertBefore(el, percentEl);
      }

      setSlot((prev) => (prev === el ? prev : el));
      return true;
    };

    const watchUntilAttached = () => {
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

    watchUntilAttached();

    // SDK may remount the bar on symbol/layout changes — reattach if slot dies
    const reconnect = window.setInterval(() => {
      const host = getHost();
      const existing = host?.querySelector<HTMLElement>(
        `:scope > .${PRICE_CLASS}`,
      );
      if (!existing?.isConnected) {
        watchUntilAttached();
      }
    }, 1000);

    return () => {
      observer?.disconnect();
      window.clearInterval(reconnect);
    };
  }, [isMobile, symbol]);

  if (!isMobile || !slot?.isConnected) {
    return null;
  }

  return createPortal(
    <Text.numeral
      dp={quoteDp}
      currency="$"
      intensity={98}
      className="oui-data-value"
    >
      {ticker?.["24h_close"]}
    </Text.numeral>,
    slot,
  );
}
