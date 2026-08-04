const CHART_DRAWING_TOOLBAR_MIGRATION_KEY =
  "idx_dex_chart_drawing_toolbar_visible_v1";
const CHART_GRID_COLOR_MIGRATION_KEY = "idx_dex_chart_dexscreener_v1";

const ADAPTER_KEY_PATTERN = /^orderly_tradingview_.*_adapter$/;
const CHART_KEY_PATTERN = /^orderly_tradingview_/;

/** DexScreener TradingView dark palette. */
export const CHART_BG_COLOR = "#131722";
export const CHART_GRID_COLOR = "#2A2E39";
export const CHART_TEXT_COLOR = "#CFD2DC";

export const CHART_THEME_OVERRIDES = {
  "paneProperties.background": CHART_BG_COLOR,
  "paneProperties.backgroundType": "solid",
  "paneProperties.vertGridProperties.color": CHART_GRID_COLOR,
  "paneProperties.horzGridProperties.color": CHART_GRID_COLOR,
  "paneProperties.separatorColor": CHART_GRID_COLOR,
  "scalesProperties.textColor": CHART_TEXT_COLOR,
} as const;

/** Orderly purple + our prior greys → DexScreener grid. */
const LEGACY_GRID_RE = /#26232[Ff]|#2[Bb]2833|#2[Ee]2[Ee]32|#2[Ee]2[Ee]33/g;
/** Prior near-black chart BG → DexScreener chart BG. */
const LEGACY_BG_RE = /#050506/g;

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

function isChartStorageKey(key: string): boolean {
  return CHART_KEY_PATTERN.test(key);
}

function sanitizeChartColors(raw: string): string {
  return raw
    .replace(LEGACY_GRID_RE, CHART_GRID_COLOR)
    .replace(LEGACY_BG_RE, CHART_BG_COLOR);
}

function patchAdapterSettings(raw: string): string {
  let settings: Record<string, string>;
  try {
    settings = JSON.parse(raw) as Record<string, string>;
  } catch {
    settings = { ...DEFAULT_ADAPTER_SETTINGS };
  }
  settings["ChartDrawingToolbarWidget.visible"] = "true";
  return sanitizeChartColors(JSON.stringify(settings));
}

function patchExistingChartStorage() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isChartStorageKey(key)) keys.push(key);
  }

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;

    if (isAdapterKey(key)) {
      localStorage.setItem(key, patchAdapterSettings(raw));
      continue;
    }

    const next = sanitizeChartColors(raw);
    if (next !== raw) {
      localStorage.setItem(key, next);
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
    let value = originalGetItem.call(this, key);

    if (value == null && isAdapterKey(key)) {
      return JSON.stringify(DEFAULT_ADAPTER_SETTINGS);
    }

    if (value != null && isChartStorageKey(key)) {
      value = isAdapterKey(key)
        ? patchAdapterSettings(value)
        : sanitizeChartColors(value);
    }

    return value;
  };
  proto.__idxDexPatched = true;
}

type ChartPane = {
  hasMainSeries: () => boolean;
  getHeight: () => number;
  setHeight: (height: number) => void;
};

type TradingViewWidgetInstance = {
  onChartReady: (cb: () => void) => void;
  applyOverrides: (overrides: Record<string, string>) => void;
  activeChart: () => { getPanes: () => ChartPane[] };
};

type TradingViewCtor = new (
  options: Record<string, unknown>,
) => TradingViewWidgetInstance;

/** Give price chart more room — Volume (and other study panes) ~15% height. */
function shrinkStudyPanes(instance: TradingViewWidgetInstance) {
  try {
    const panes = instance.activeChart().getPanes();
    if (panes.length < 2) return;

    const main = panes.find((pane) => pane.hasMainSeries()) ?? panes[0];
    const studies = panes.filter((pane) => pane !== main);
    if (studies.length === 0) return;

    const total = panes.reduce((sum, pane) => sum + pane.getHeight(), 0);
    if (total <= 0) return;

    const budget = Math.min(140, Math.max(64, Math.round(total * 0.15)));
    const each = Math.max(56, Math.floor(budget / studies.length));
    for (const pane of studies) {
      pane.setHeight(each);
    }
  } catch {
    // Chart API may not be ready yet
  }
}

/** Force DexScreener chart colors + compact Volume pane over saved chart state. */
function installTradingViewGridForce() {
  const w = window as Window & {
    TradingView?: { widget?: TradingViewCtor & { __idxGridPatched?: boolean } };
    __idxTvGridPatchTimer?: number;
  };

  const tryPatch = (): boolean => {
    const Original = w.TradingView?.widget;
    if (!Original || Original.__idxGridPatched) {
      return Boolean(Original?.__idxGridPatched);
    }

    function PatchedWidget(
      this: TradingViewWidgetInstance,
      options: Record<string, unknown>,
    ) {
      const nextOptions = {
        ...options,
        overrides: {
          ...((options.overrides as Record<string, string>) || {}),
          ...CHART_THEME_OVERRIDES,
        },
        settings_overrides: {
          ...((options.settings_overrides as Record<string, string>) || {}),
          ...CHART_THEME_OVERRIDES,
        },
      };

      const instance = new Original!(nextOptions);
      instance.onChartReady(() => {
        try {
          instance.applyOverrides({ ...CHART_THEME_OVERRIDES });
          shrinkStudyPanes(instance);
          // Saved layouts can restore tall Volume after ready — nudge again
          window.setTimeout(() => shrinkStudyPanes(instance), 300);
          window.setTimeout(() => shrinkStudyPanes(instance), 1200);
        } catch {
          // Chart may already be disposed
        }
      });
      return instance;
    }

    PatchedWidget.prototype = Original.prototype;
    (
      PatchedWidget as unknown as TradingViewCtor & {
        __idxGridPatched?: boolean;
      }
    ).__idxGridPatched = true;
    w.TradingView!.widget = PatchedWidget as unknown as TradingViewCtor & {
      __idxGridPatched?: boolean;
    };
    return true;
  };

  if (tryPatch()) return;

  if (w.__idxTvGridPatchTimer) return;
  w.__idxTvGridPatchTimer = window.setInterval(() => {
    if (tryPatch()) {
      window.clearInterval(w.__idxTvGridPatchTimer);
      w.__idxTvGridPatchTimer = undefined;
    }
  }, 50);
}

/** Ensure TradingView drawing toolbar is visible and chart uses DexScreener colors. */
export function applyDefaultChartSettings() {
  if (typeof window === "undefined") return;

  installGetItemPatch();
  installTradingViewGridForce();
  patchExistingChartStorage();

  if (!localStorage.getItem(CHART_DRAWING_TOOLBAR_MIGRATION_KEY)) {
    localStorage.setItem(CHART_DRAWING_TOOLBAR_MIGRATION_KEY, "1");
  }
  if (!localStorage.getItem(CHART_GRID_COLOR_MIGRATION_KEY)) {
    localStorage.setItem(CHART_GRID_COLOR_MIGRATION_KEY, "1");
  }
}
