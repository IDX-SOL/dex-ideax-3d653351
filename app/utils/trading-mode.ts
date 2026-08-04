export type TradingMode = "lite" | "pro";

export const TRADING_MODE_STORAGE_KEY = "idx_dex_trading_mode";
export const TRADING_MODE_CHANGE_EVENT = "idx-dex-trading-mode-change";

export function isTradingMode(value: unknown): value is TradingMode {
  return value === "lite" || value === "pro";
}

export function getStoredTradingMode(): TradingMode {
  // Default for new visits is Lite; Pro is the full UI when chosen.
  if (typeof window === "undefined") return "lite";
  try {
    const stored = localStorage.getItem(TRADING_MODE_STORAGE_KEY);
    return isTradingMode(stored) ? stored : "lite";
  } catch {
    return "lite";
  }
}

export function setStoredTradingMode(mode: TradingMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRADING_MODE_STORAGE_KEY, mode);
  document.documentElement.dataset.idxTradingMode = mode;
  window.dispatchEvent(
    new CustomEvent(TRADING_MODE_CHANGE_EVENT, { detail: { mode } }),
  );
}

export function applyTradingModeToDocument(
  mode: TradingMode = getStoredTradingMode(),
): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.idxTradingMode = mode;
}
