/** Orderly TradingPage localStorage key for horizontal/sidebar markets placement. */
export const ORDERLY_HORIZONTAL_MARKETS_LAYOUT_KEY =
  "orderly_horizontal_markets_layout";

export const DEFAULT_MARKET_LAYOUT = "top";

const MARKET_LAYOUT_MIGRATION_KEY = "idx_dex_default_market_layout_top_v2";
const ORDER_TYPE_STORAGE_KEY = "orderly-order-entry-order-type";
const ORDER_TYPE_MARKET_MIGRATION_KEY = "idx_dex_default_order_type_market_v1";
/** Orderly header account-summary visible metrics (⋯ menu). */
const ACCOUNT_SUMMARY_TYPES_KEY = "accountSummaryTypes";
const HIDE_HEADER_TOTAL_VALUE_MIGRATION_KEY =
  "idx_dex_hide_header_total_value_v1";
/** Orderly chart|order-book split — stored as a bare number → rendered as `%`. */
const ORDERLY_ORDERBOOK_SPLIT_SIZE_KEY = "orderly_orderbook_split_size";
const ORDERBOOK_WIDTH_MIGRATION_KEY = "idx_dex_orderbook_standard_width_v1";
/** Match order-entry / SDK default so Order book & Last trades tabs share one width. */
export const ORDERBOOK_STANDARD_WIDTH_PX = 280;
/** Wider than Orderly’s 280px default so Buy/Sell + fields breathe. */
export const ORDER_ENTRY_DEFAULT_WIDTH_PX = 320;
/** Orderly main↔order-entry split persistence key. */
const ORDERLY_MAIN_SPLIT_SIZE_KEY = "orderly_main_split_size";
const ORDER_ENTRY_WIDTH_MIGRATION_KEY = "idx_dex_order_entry_width_320_v1";
/** Order entry TP/SL “additional” panel pin (SDK defaults to pinned). */
const ORDERLY_ORDER_ADDITIONAL_PINNED_KEY = "orderly-order-additional-pinned";
const UNPIN_ORDER_ADDITIONAL_MIGRATION_KEY =
  "idx_dex_order_additional_unpinned_v1";

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

  // One-time: switch stored order type default to Market (was Limit).
  if (!localStorage.getItem(ORDER_TYPE_MARKET_MIGRATION_KEY)) {
    setOrderlyLocalStorage(ORDER_TYPE_STORAGE_KEY, "MARKET");
    localStorage.setItem(ORDER_TYPE_MARKET_MIGRATION_KEY, "1");
  }

  // One-time: hide header "Total value" by default (Orderly defaults to showing it).
  // Users can still enable it (and other metrics) from the header ⋯ menu.
  if (!localStorage.getItem(HIDE_HEADER_TOTAL_VALUE_MIGRATION_KEY)) {
    const summaryTypes = getOrderlyLocalStorage<string[]>(
      ACCOUNT_SUMMARY_TYPES_KEY,
    );
    const isDefaultTotalValueOnly =
      summaryTypes === undefined ||
      (Array.isArray(summaryTypes) &&
        summaryTypes.length === 1 &&
        summaryTypes[0] === "totalValue");
    if (isDefaultTotalValueOnly) {
      setOrderlyLocalStorage(ACCOUNT_SUMMARY_TYPES_KEY, []);
    }
    localStorage.setItem(HIDE_HEADER_TOTAL_VALUE_MIGRATION_KEY, "1");
  }

  // One-time: reset chart|order-book split so the panel uses the standard width.
  // (Drag used to persist a %; with resize removed we keep a fixed 280px panel.)
  if (!localStorage.getItem(ORDERBOOK_WIDTH_MIGRATION_KEY)) {
    localStorage.removeItem(ORDERLY_ORDERBOOK_SPLIT_SIZE_KEY);
    localStorage.setItem(ORDERBOOK_WIDTH_MIGRATION_KEY, "1");
  }

  // One-time: widen order-entry panel default (Orderly persists 280px).
  if (!localStorage.getItem(ORDER_ENTRY_WIDTH_MIGRATION_KEY)) {
    setOrderlyLocalStorage(
      ORDERLY_MAIN_SPLIT_SIZE_KEY,
      `${ORDER_ENTRY_DEFAULT_WIDTH_PX}px`,
    );
    localStorage.setItem(ORDER_ENTRY_WIDTH_MIGRATION_KEY, "1");
  }

  // One-time: leave order-entry additional (TP/SL) unpinned by default.
  if (!localStorage.getItem(UNPIN_ORDER_ADDITIONAL_MIGRATION_KEY)) {
    setOrderlyLocalStorage(ORDERLY_ORDER_ADDITIONAL_PINNED_KEY, false);
    localStorage.setItem(UNPIN_ORDER_ADDITIONAL_MIGRATION_KEY, "1");
  }

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
