/**
 * Smooth top horizontal markets bar via CSS marquee (not Embla JS scroll).
 * Also: stable symbols list, throttled prices, no item CSS transitions.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function writeIfChanged(filePath, next) {
  const prev = fs.readFileSync(filePath, "utf8");
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

/**
 * CSS marquee v4: stay paused until track width matches symbol count
 * (ticker rows often mount empty → early duration = fast burst on refresh).
 * CSS must use animation-duration: var(--idx-hm-duration, …).
 */
const IDX_CSS_MARQUEE_ESM = `var IdxCssMarquee = (props) => {
      const { data, renderItem, className } = props;
      const trackRef = React7.useRef(null);
      const listKey = React7.useMemo(
        () => Array.isArray(data) ? data.join("\\0") : "",
        [data]
      );
      const itemCount = Array.isArray(data) ? data.length : 0;
      const [ready, setReady] = React7.useState(false);
      React7.useLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        setReady(false);
        track.style.removeProperty("--idx-hm-duration");
        const t0 = performance.now();
        const expectedMinHalf = Math.max(120, itemCount * 120);
        const STABLE_MS = 800;
        const MAX_WAIT_MS = 3e3;
        let lastHalf = 0;
        let stableTimer = 0;
        let playing = false;
        let cancelled = false;
        const commit = (half) => {
          if (cancelled || playing || half < 120) return;
          playing = true;
          window.clearTimeout(stableTimer);
          track.style.setProperty(
            "--idx-hm-duration",
            \`\${Math.max(55, half / 80)}s\`
          );
          setReady(true);
        };
        const sample = () => {
          if (cancelled || playing) return;
          const half = track.scrollWidth / 2;
          if (half < 120) return;
          const elapsed = performance.now() - t0;
          const wideEnough = half >= expectedMinHalf || elapsed >= MAX_WAIT_MS;
          if (!wideEnough) return;
          if (Math.abs(half - lastHalf) > 6) {
            lastHalf = half;
            window.clearTimeout(stableTimer);
            stableTimer = window.setTimeout(() => {
              if (cancelled || playing) return;
              const nextHalf = track.scrollWidth / 2;
              const waited = performance.now() - t0;
              if (nextHalf >= expectedMinHalf || waited >= MAX_WAIT_MS) {
                commit(nextHalf);
              }
            }, STABLE_MS);
          }
        };
        const raf = requestAnimationFrame(() => requestAnimationFrame(sample));
        const ro =
          typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(sample)
            : null;
        ro?.observe(track);
        const timers = [200, 500, 1e3, 1600, 2400, MAX_WAIT_MS].map((ms) =>
          window.setTimeout(sample, ms)
        );
        return () => {
          cancelled = true;
          cancelAnimationFrame(raf);
          ro?.disconnect();
          window.clearTimeout(stableTimer);
          timers.forEach((id) => window.clearTimeout(id));
        };
      }, [listKey, itemCount]); // idx_hm_marquee_stable_v4
      if (!Array.isArray(data) || data.length === 0) return null;
      const row = (prefix) => data.map((item, index) => /* @__PURE__ */ jsx(
        "div",
        {
          className: "oui-shrink-0",
          children: renderItem(item, index)
        },
        \`\${prefix}-\${item}\`
      ));
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: cn("idx-hm-marquee", className),
          children: /* @__PURE__ */ jsxs(
            "div",
            {
              ref: trackRef,
              className: cn("idx-hm-marquee-track", ready && "idx-hm-ready"),
              children: [row("a"), row("b")]
            }
          )
        }
      );
    };
    `;

const IDX_CSS_MARQUEE_CJS = `var IdxCssMarquee = (props) => {
      const { data, renderItem, className } = props;
      const trackRef = React7__default.default.useRef(null);
      const listKey = React7__default.default.useMemo(
        () => Array.isArray(data) ? data.join("\\0") : "",
        [data]
      );
      const itemCount = Array.isArray(data) ? data.length : 0;
      const [ready, setReady] = React7__default.default.useState(false);
      React7__default.default.useLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        setReady(false);
        track.style.removeProperty("--idx-hm-duration");
        const t0 = performance.now();
        const expectedMinHalf = Math.max(120, itemCount * 120);
        const STABLE_MS = 800;
        const MAX_WAIT_MS = 3e3;
        let lastHalf = 0;
        let stableTimer = 0;
        let playing = false;
        let cancelled = false;
        const commit = (half) => {
          if (cancelled || playing || half < 120) return;
          playing = true;
          window.clearTimeout(stableTimer);
          track.style.setProperty(
            "--idx-hm-duration",
            \`\${Math.max(55, half / 80)}s\`
          );
          setReady(true);
        };
        const sample = () => {
          if (cancelled || playing) return;
          const half = track.scrollWidth / 2;
          if (half < 120) return;
          const elapsed = performance.now() - t0;
          const wideEnough = half >= expectedMinHalf || elapsed >= MAX_WAIT_MS;
          if (!wideEnough) return;
          if (Math.abs(half - lastHalf) > 6) {
            lastHalf = half;
            window.clearTimeout(stableTimer);
            stableTimer = window.setTimeout(() => {
              if (cancelled || playing) return;
              const nextHalf = track.scrollWidth / 2;
              const waited = performance.now() - t0;
              if (nextHalf >= expectedMinHalf || waited >= MAX_WAIT_MS) {
                commit(nextHalf);
              }
            }, STABLE_MS);
          }
        };
        const raf = requestAnimationFrame(() => requestAnimationFrame(sample));
        const ro =
          typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(sample)
            : null;
        ro?.observe(track);
        const timers = [200, 500, 1e3, 1600, 2400, MAX_WAIT_MS].map((ms) =>
          window.setTimeout(sample, ms)
        );
        return () => {
          cancelled = true;
          cancelAnimationFrame(raf);
          ro?.disconnect();
          window.clearTimeout(stableTimer);
          timers.forEach((id) => window.clearTimeout(id));
        };
      }, [listKey, itemCount]); // idx_hm_marquee_stable_v4
      if (!Array.isArray(data) || data.length === 0) return null;
      const row = (prefix) => data.map((item, index) => /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          className: "oui-shrink-0",
          children: renderItem(item, index)
        },
        \`\${prefix}-\${item}\`
      ));
      return /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          className: ui.cn("idx-hm-marquee", className),
          children: /* @__PURE__ */ jsxRuntime.jsxs(
            "div",
            {
              ref: trackRef,
              className: ui.cn("idx-hm-marquee-track", ready && "idx-hm-ready"),
              children: [row("a"), row("b")]
            }
          )
        }
      );
    };
    `;

function replaceIdxCssMarquee(code, replacement, assignPrefix) {
  const start = code.indexOf("var IdxCssMarquee = ");
  if (start === -1) return null;
  const endMarker = assignPrefix;
  const end = code.indexOf(endMarker, start);
  if (end === -1) return null;
  return code.slice(0, start) + replacement + code.slice(end);
}

function patchInjectCssMarquee(code) {
  // Refresh existing marquee when version marker is missing/outdated
  if (code.includes("var IdxCssMarquee = ")) {
    if (code.includes("idx_hm_marquee_stable_v4")) return code;
    const esm = replaceIdxCssMarquee(
      code,
      IDX_CSS_MARQUEE_ESM,
      "HorizontalMarkets = React7.memo(",
    );
    if (esm) return esm;
    const cjs = replaceIdxCssMarquee(
      code,
      IDX_CSS_MARQUEE_CJS,
      "exports.HorizontalMarkets = React7__default.default.memo(",
    );
    if (cjs) return cjs;
    return code;
  }

  let next = code.replace(
    /HorizontalMarkets = React7\.memo\(\(props\) => \{/,
    `${IDX_CSS_MARQUEE_ESM}HorizontalMarkets = React7.memo((props) => {`,
  );

  next = next.replace(
    /exports\.HorizontalMarkets = React7__default\.default\.memo\(\(props\) => \{/,
    `${IDX_CSS_MARQUEE_CJS}exports.HorizontalMarkets = React7__default.default.memo((props) => {`,
  );

  return next;
}

function patchUseCssMarquee(code) {
  let next = code.replace(
    /\/\* @__PURE__ \*\/ jsx\(\n                  Marquee,\n                  \{\n                    data: symbols,\n                    renderItem: renderMarketItem,\n                    carouselOptions,\n                    autoScrollOptions,\n                    className: "oui-h-full"\n                  \}\n                \)/g,
    `/* @__PURE__ */ jsx(
                  IdxCssMarquee,
                  {
                    data: symbols,
                    renderItem: renderMarketItem,
                    className: "oui-h-full"
                  }
                )`,
  );

  next = next.replace(
    /\/\* @__PURE__ \*\/ jsxRuntime\.jsx\(\n                  ui\.Marquee,\n                  \{\n                    data: symbols,\n                    renderItem: renderMarketItem,\n                    carouselOptions,\n                    autoScrollOptions,\n                    className: "oui-h-full"\n                  \}\n                \)/g,
    `/* @__PURE__ */ jsxRuntime.jsx(
                  IdxCssMarquee,
                  {
                    data: symbols,
                    renderItem: renderMarketItem,
                    className: "oui-h-full"
                  }
                )`,
  );

  return next;
}

function patchHorizontalMarketsRenderItem(code) {
  if (code.includes("tickerDataRef.current = tickerData")) return code;

  let next = code.replace(
    /const renderMarketItem = React7\.useCallback\(\n        \(symbol, index\) => \{\n          const data = tickerData\[symbol\];\n          const isActive = currentSymbol === symbol;\n          if \(!data\) \{\n            return null;\n          \}\n          return \/\* @__PURE__ \*\/ jsx\(\n            MarketItem,\n            \{\n              symbol,\n              tickerData: data,\n              isActive,\n              onSymbolClick\n            \},\n            symbol\n          \);\n        \},\n        \[tickerData, currentSymbol, onSymbolClick\]\n      \);/,
    `const tickerDataRef = React7.useRef(tickerData);
      tickerDataRef.current = tickerData;
      const renderMarketItem = React7.useCallback(
        (symbol, index) => {
          const data = tickerDataRef.current[symbol];
          const isActive = currentSymbol === symbol;
          if (!data) {
            return null;
          }
          return /* @__PURE__ */ jsx(
            MarketItem,
            {
              symbol,
              tickerData: data,
              isActive,
              onSymbolClick
            },
            symbol
          );
        },
        [currentSymbol, onSymbolClick]
      );`,
  );

  next = next.replace(
    /const renderMarketItem = React7__default\.default\.useCallback\(\n        \(symbol, index\) => \{\n          const data = tickerData\[symbol\];\n          const isActive = currentSymbol === symbol;\n          if \(!data\) \{\n            return null;\n          \}\n          return \/\* @__PURE__ \*\/ jsxRuntime\.jsx\(\n            exports\.MarketItem,\n            \{\n              symbol,\n              tickerData: data,\n              isActive,\n              onSymbolClick\n            \},\n            symbol\n          \);\n        \},\n        \[tickerData, currentSymbol, onSymbolClick\]\n      \);/,
    `const tickerDataRef = React7__default.default.useRef(tickerData);
      tickerDataRef.current = tickerData;
      const renderMarketItem = React7__default.default.useCallback(
        (symbol, index) => {
          const data = tickerDataRef.current[symbol];
          const isActive = currentSymbol === symbol;
          if (!data) {
            return null;
          }
          return /* @__PURE__ */ jsxRuntime.jsx(
            exports.MarketItem,
            {
              symbol,
              tickerData: data,
              isActive,
              onSymbolClick
            },
            symbol
          );
        },
        [currentSymbol, onSymbolClick]
      );`,
  );

  return next;
}

function patchTickerThrottle(code) {
  if (code.includes("idx_hm_ticker_throttle")) return code;

  let next = code.replace(
    /const tickerData = useMemo\(\(\) => \{\n    return sortedMarkets\.reduce\(\(acc, item\) => \{\n      acc\[item\.symbol\] = \{\n        "24h_close": item\["24h_close"\],\n        change: item\.change,\n        quote_dp: item\.quote_dp\n      \};\n      return acc;\n    \}, \{\}\);\n  \}, \[sortedMarkets\]\);/,
    `const liveTickerData = useMemo(() => {
    return sortedMarkets.reduce((acc, item) => {
      acc[item.symbol] = {
        "24h_close": item["24h_close"],
        change: item.change,
        quote_dp: item.quote_dp
      };
      return acc;
    }, {});
  }, [sortedMarkets]);
  // idx_hm_ticker_throttle — cut marquee re-render rate vs raw WS ticks
  const [tickerData, setTickerData] = useState(liveTickerData);
  useEffect(() => {
    const id = window.setTimeout(() => setTickerData(liveTickerData), 400);
    return () => window.clearTimeout(id);
  }, [liveTickerData]);`,
  );

  next = next.replace(
    /const tickerData = React7\.useMemo\(\(\) => \{\n    return sortedMarkets\.reduce\(\(acc, item\) => \{\n      acc\[item\.symbol\] = \{\n        "24h_close": item\["24h_close"\],\n        change: item\.change,\n        quote_dp: item\.quote_dp\n      \};\n      return acc;\n    \}, \{\}\);\n  \}, \[sortedMarkets\]\);/,
    `const liveTickerData = React7.useMemo(() => {
    return sortedMarkets.reduce((acc, item) => {
      acc[item.symbol] = {
        "24h_close": item["24h_close"],
        change: item.change,
        quote_dp: item.quote_dp
      };
      return acc;
    }, {});
  }, [sortedMarkets]);
  // idx_hm_ticker_throttle — cut marquee re-render rate vs raw WS ticks
  const [tickerData, setTickerData] = React7.useState(liveTickerData);
  React7.useEffect(() => {
    const id = window.setTimeout(() => setTickerData(liveTickerData), 400);
    return () => window.clearTimeout(id);
  }, [liveTickerData]);`,
  );

  return next;
}

function patchStableSymbols(code) {
  if (code.includes("idx_hm_stable_symbols")) return code;

  let next = code.replace(
    /const symbols = useMemo\(\(\) => \{\n    const list = optionSymbols \? optionSymbols : sortedMarkets\.map\(\(m\) => m\.symbol\);\n    const max = optionMaxItems;\n    if \(typeof max === "number"\) \{\n      if \(max === -1\) return list;\n      if \(max >= 0\) return list\.slice\(0, max\);\n    \}\n    return list;\n  \}, \[sortedMarkets, optionSymbols, optionMaxItems\]\);/,
    `// idx_hm_stable_symbols — keep array identity when only prices change
  const marketsSymbolKey = sortedMarkets.map((m) => m.symbol).join("\\0");
  const symbols = useMemo(() => {
    const list = optionSymbols
      ? optionSymbols
      : marketsSymbolKey
        ? marketsSymbolKey.split("\\0")
        : [];
    const max = optionMaxItems;
    if (typeof max === "number") {
      if (max === -1) return list;
      if (max >= 0) return list.slice(0, max);
    }
    return list;
  }, [marketsSymbolKey, optionSymbols, optionMaxItems]);`,
  );

  next = next.replace(
    /const symbols = React7\.useMemo\(\(\) => \{\n    const list = optionSymbols \? optionSymbols : sortedMarkets\.map\(\(m\) => m\.symbol\);\n    const max = optionMaxItems;\n    if \(typeof max === "number"\) \{\n      if \(max === -1\) return list;\n      if \(max >= 0\) return list\.slice\(0, max\);\n    \}\n    return list;\n  \}, \[sortedMarkets, optionSymbols, optionMaxItems\]\);/,
    `// idx_hm_stable_symbols — keep array identity when only prices change
  const marketsSymbolKey = sortedMarkets.map((m) => m.symbol).join("\\0");
  const symbols = React7.useMemo(() => {
    const list = optionSymbols
      ? optionSymbols
      : marketsSymbolKey
        ? marketsSymbolKey.split("\\0")
        : [];
    const max = optionMaxItems;
    if (typeof max === "number") {
      if (max === -1) return list;
      if (max >= 0) return list.slice(0, max);
    }
    return list;
  }, [marketsSymbolKey, optionSymbols, optionMaxItems]);`,
  );

  return next;
}

/** Keep IDX DexScreener chip after SOL — never first in the marquee. */
function patchIdxChipNotFirst(code) {
  if (code.includes("idx_hm_external_idx — IDX spot chip after SOL")) {
    return code;
  }
  // Legacy prepend → after SOL
  if (code.includes('["__IDX_DEXSCREENER__", ...out]')) {
    return code.replace(
      /\/\/ idx_hm_external_idx — prepend IDX spot chip \(DexScreener link\)\n([\s\S]*?)return out\.length \? \["__IDX_DEXSCREENER__", \.\.\.out\] : out;/g,
      `// idx_hm_external_idx — IDX spot chip after SOL (not first in the bar)
$1if (!out.length) return out;
    const IDX = "__IDX_DEXSCREENER__";
    const filtered = out.filter((s) => s !== IDX);
    const solIdx = filtered.indexOf("PERP_SOL_USDC");
    const insertAt = solIdx >= 0 ? solIdx + 1 : Math.min(1, filtered.length);
    return [
      ...filtered.slice(0, insertAt),
      IDX,
      ...filtered.slice(insertAt)
    ];`,
    );
  }
  return code;
}

function patchRemoveItemTransition(code) {
  return code.replace(
    /"oui-transition-all oui-duration-200"/g,
    '"oui-duration-0"',
  );
}

function bumpThrottle(code) {
  return code.replace(
    /setTimeout\(\(\) => setTickerData\(liveTickerData\), 300\)/g,
    "setTimeout(() => setTickerData(liveTickerData), 400)",
  );
}

function patchMarkets(code) {
  let next = code;
  next = patchInjectCssMarquee(next);
  next = patchUseCssMarquee(next);
  next = patchHorizontalMarketsRenderItem(next);
  next = patchTickerThrottle(next);
  next = bumpThrottle(next);
  next = patchStableSymbols(next);
  next = patchIdxChipNotFirst(next);
  next = patchRemoveItemTransition(next);
  return next;
}

const targets = [
  {
    file: path.join(
      root,
      "node_modules/@orderly.network/markets/dist/index.mjs",
    ),
    patch: patchMarkets,
  },
  {
    file: path.join(
      root,
      "node_modules/@orderly.network/markets/dist/index.js",
    ),
    patch: patchMarkets,
  },
];

let changed = 0;
for (const { file, patch } of targets) {
  if (!fs.existsSync(file)) {
    console.warn("skip missing", file);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const next = patch(before);
  if (next === before) {
    console.log("unchanged", path.relative(root, file));
    continue;
  }
  if (!next.includes("IdxCssMarquee") || !next.includes("idx-hm-ready")) {
    console.error("FAILED: IdxCssMarquee ready-gate missing after patch", file);
    continue;
  }
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`horizontal-markets CSS marquee patch done (${changed} files updated)`);
