import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  useFeeState,
  useMarkPrice,
  useRwaSymbolsInfoStore,
} from "@orderly.network/hooks";
import { useTranslation } from "@orderly.network/i18n";
import { Text } from "@orderly.network/ui";

const HOST_CLASS = "idx-order-entry-fees";
const ROOT_MARK = "idx-fees-amount-active";

function parseFeeRate(pct: string | undefined): number | null {
  if (!pct || pct === "-") return null;
  const n = Number.parseFloat(pct.replace("%", "").trim());
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

function readNotional(markPrice: number | undefined): number | null {
  const root = document.querySelector(".oui-orderEntry");
  if (!root) return null;

  const totalEl = root.querySelector<HTMLInputElement>("#order_total_input");
  const qtyEl = root.querySelector<HTMLInputElement>("#order_quantity_input");
  const priceEl = root.querySelector<HTMLInputElement>("#order_price_input");

  const total = Number.parseFloat(totalEl?.value ?? "");
  if (Number.isFinite(total) && total > 0) return total;

  const qty = Number.parseFloat(qtyEl?.value ?? "");
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const price = Number.parseFloat(priceEl?.value ?? "");
  if (Number.isFinite(price) && price > 0) return qty * price;

  if (typeof markPrice === "number" && markPrice > 0) return qty * markPrice;

  return null;
}

function formatFeeAmount(amount: number): string {
  if (amount > 0 && amount < 0.01) return "~$0.00";
  return `$${amount.toFixed(2)}`;
}

function findOrCreateHost(): HTMLElement | null {
  const fees = document.querySelector<HTMLElement>(".oui-orderEntry-fees");
  if (!fees) return null;

  const label = fees.querySelector<HTMLElement>(".oui-fees-label");
  const row = label?.parentElement;
  if (!row) return null;

  fees.classList.add(ROOT_MARK);

  let host = row.querySelector<HTMLElement>(`:scope > .${HOST_CLASS}`);
  if (!host) {
    host = document.createElement("span");
    host.className = `${HOST_CLASS} oui-text-2xs oui-truncate`;
    row.appendChild(host);
  }

  return host;
}

function cleanupHosts() {
  document.querySelectorAll(`.${HOST_CLASS}`).forEach((el) => el.remove());
  document
    .querySelectorAll(`.${ROOT_MARK}`)
    .forEach((el) => el.classList.remove(ROOT_MARK));
}

/**
 * Replaces Orderly's static Taker/Maker fee % with estimated fee amounts
 * once quantity/total (and price for limit) are set. Empty entry → "-".
 * Rates still come from Orderly fee tier / account APIs.
 */
export function OrderEntryFeeAmounts({ symbol }: { symbol: string }) {
  const { t } = useTranslation();
  const { takerFee, makerFee, rwaTakerFee, rwaMakerFee } = useFeeState();
  const rwaInfo = useRwaSymbolsInfoStore();
  const isRwa = rwaInfo?.[symbol] !== undefined;
  const { data: markPrice } = useMarkPrice(symbol);

  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [notional, setNotional] = useState<number | null>(null);

  const takerRate = parseFeeRate(isRwa ? rwaTakerFee : takerFee);
  const makerRate = parseFeeRate(isRwa ? rwaMakerFee : makerFee);

  useLayoutEffect(() => {
    let observer: MutationObserver | null = null;

    const attach = (): boolean => {
      const host = findOrCreateHost();
      if (!host) {
        setSlot(null);
        return false;
      }
      setSlot((prev) => (prev === host ? prev : host));
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

    const reconnect = window.setInterval(() => {
      const fees = document.querySelector(".oui-orderEntry-fees");
      const existing = fees?.querySelector(`.${HOST_CLASS}`);
      if (!existing?.isConnected) {
        watchUntilAttached();
      }
    }, 1000);

    return () => {
      observer?.disconnect();
      window.clearInterval(reconnect);
      cleanupHosts();
    };
  }, [symbol]);

  useEffect(() => {
    const syncNotional = () => {
      setNotional(readNotional(markPrice));
    };

    syncNotional();

    const root = document.querySelector(".oui-orderEntry");
    if (!root) return;

    root.addEventListener("input", syncNotional);
    root.addEventListener("change", syncNotional);

    const poll = window.setInterval(syncNotional, 400);

    return () => {
      root.removeEventListener("input", syncNotional);
      root.removeEventListener("change", syncNotional);
      window.clearInterval(poll);
    };
  }, [symbol, markPrice, slot]);

  const takerAmount = useMemo(() => {
    if (notional == null || takerRate == null) return null;
    return notional * takerRate;
  }, [notional, takerRate]);

  const makerAmount = useMemo(() => {
    if (notional == null || makerRate == null) return null;
    return notional * makerRate;
  }, [notional, makerRate]);

  if (!slot?.isConnected) return null;

  const takerLabel = t("dmm.taker");
  const makerLabel = t("dmm.maker");
  const takerText = takerAmount == null ? "-" : formatFeeAmount(takerAmount);
  const makerText = makerAmount == null ? "-" : formatFeeAmount(makerAmount);

  return createPortal(
    <Text size="2xs" className="oui-truncate">
      {takerLabel}:{" "}
      <Text size="2xs" className="oui-text-base-contrast-80">
        {takerText}
      </Text>
      {" / "}
      {makerLabel}:{" "}
      <Text size="2xs" className="oui-text-base-contrast-80">
        {makerText}
      </Text>
    </Text>,
    slot,
  );
}
