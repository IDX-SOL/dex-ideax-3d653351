import { iconSymbolFromSymbol } from "@/lib/exchange/orderlyMarkets";

export const BINANCE_SYMBOL_OVERRIDES: Record<string, string> = {
  NAS100: "QQQUSDT",
  US100: "QQQUSDT",
  US500: "SPYUSDT",
  SPX500: "SPYUSDT",
  SPX: "SPYUSDT",
};

const FOREX_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
]);

export function isForexBase(base: string) {
  if (!base || base.length !== 6) return false;
  return (
    FOREX_CURRENCIES.has(base.slice(0, 3)) &&
    FOREX_CURRENCIES.has(base.slice(3, 6))
  );
}

export function binanceFuturesSymbol(orderlySymbol: string) {
  const base = iconSymbolFromSymbol(orderlySymbol);
  if (!base || isForexBase(base)) return null;

  const override = BINANCE_SYMBOL_OVERRIDES[base];
  if (override) return override;

  return `${base}USDT`;
}
