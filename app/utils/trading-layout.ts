/** Orderly TradingPage localStorage key for horizontal/sidebar markets placement. */
export const ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY =
  "orderly_horizontal_markets_layout";

export const DEFAULT_MARKET_LAYOUT = "top";

const MARKET_LAYOUT_MIGRATION_KEY = "idx_dex_default_market_layout_top_v2";

/** Set a value using Orderly's JSON.stringify localStorage convention. */
export function setOrderlyLocalStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getOrderlyLocalStorage<T>(key: string): T | undefined {
  const raw = localStorage.getItem(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Apply IDX default: horizontal markets bar on top. */
export function applyDefaultTradingLayout() {
  if (typeof window === "undefined") return;

  const migrated = localStorage.getItem(MARKET_LAYOUT_MIGRATION_KEY);
  if (!migrated) {
    setOrderlyLocalStorage(
      ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY,
      DEFAULT_MARKET_LAYOUT,
    );
    localStorage.setItem(MARKET_LAYOUT_MIGRATION_KEY, "1");
    return;
  }

  const existing = localStorage.getItem(ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY);
  if (!existing) {
    setOrderlyLocalStorage(
      ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY,
      DEFAULT_MARKET_LAYOUT,
    );
    return;
  }

  if (
    getOrderlyLocalStorage<string>(ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY) ===
    undefined
  ) {
    setOrderlyLocalStorage(
      ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY,
      DEFAULT_MARKET_LAYOUT,
    );
  }
}
