const CHART_DRAWING_TOOLBAR_MIGRATION_KEY =
  "idx_dex_chart_drawing_toolbar_visible_v1";

const ADAPTER_KEY_PATTERN = /^orderly_tradingview_.*_adapter$/;

/** Orderly persistUtils defaultSettings plus visible drawing toolbar. */
const DEFAULT_ADAPTER_SETTINGS: Record<string, string> = {
  "trading.chart.proterty": JSON.stringify({
    showSellBuyButtons: 0,
    noConfirmEnabled: 1,
    qweqrq: 0,
    showPricesWithZeroVolume: 1,
    showSpread: 1,
    orderExecutedSoundParams: '{"enabled":0,"name":"alert/alarm_clock"}',
  }),
  "hint.startFocusedZoom": "true",
  "ChartDrawingToolbarWidget.visible": "true",
};

function isAdapterKey(key: string): boolean {
  return ADAPTER_KEY_PATTERN.test(key);
}

function patchAdapterSettings(raw: string): string {
  let settings: Record<string, string>;
  try {
    settings = JSON.parse(raw) as Record<string, string>;
  } catch {
    settings = { ...DEFAULT_ADAPTER_SETTINGS };
  }
  settings["ChartDrawingToolbarWidget.visible"] = "true";
  return JSON.stringify(settings);
}

function patchExistingAdapterKeys() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isAdapterKey(key)) continue;

    const raw = localStorage.getItem(key);
    if (raw != null) {
      localStorage.setItem(key, patchAdapterSettings(raw));
    }
  }
}

function installGetItemPatch() {
  const proto = Storage.prototype
    .getItem as typeof Storage.prototype.getItem & {
    __idxDexPatched?: boolean;
  };
  if (proto.__idxDexPatched) return;

  const originalGetItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key: string) {
    const value = originalGetItem.call(this, key);
    if (value == null && isAdapterKey(key)) {
      return JSON.stringify(DEFAULT_ADAPTER_SETTINGS);
    }
    return value;
  };
  proto.__idxDexPatched = true;
}

/** Ensure TradingView drawing toolbar is visible by default. */
export function applyDefaultChartSettings() {
  if (typeof window === "undefined") return;

  patchExistingAdapterKeys();

  const migrated = localStorage.getItem(CHART_DRAWING_TOOLBAR_MIGRATION_KEY);
  if (!migrated) {
    installGetItemPatch();
    localStorage.setItem(CHART_DRAWING_TOOLBAR_MIGRATION_KEY, "1");
  }
}
