/**
 * Cap TradingView chart height to the viewport so expand/drag cannot push
 * the trading layout off-screen (mobile + desktop, Lite + Pro).
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_chart_viewport_clamp";

const targets = [
  {
    rel: "node_modules/@orderly.network/trading/dist/index.mjs",
    useState: "useState",
    useEffect: "useEffect",
    useCallback: "useCallback",
    useLocalStorage: "useLocalStorage",
    useRef: "useRef",
  },
  {
    rel: "node_modules/@orderly.network/trading/dist/index.js",
    useState: "React12.useState",
    useEffect: "React12.useEffect",
    useCallback: "React12.useCallback",
    useLocalStorage: "hooks.useLocalStorage",
    useRef: "React12.useRef",
  },
];

const HELPER_V2_MARK = `${MARKER}_v2`;

/** Dynamic mobile chart cap: leftover viewport, tighter on short/landscape. */
const HELPER = `
function idxMobileChartMaxHeight() {
  // ${HELPER_V2_MARK}
  if (typeof window === "undefined") return 280;
  const vh = window.innerHeight || 800;
  const short = vh < 900;
  // Short/landscape (iPad Pro horizontal, small laptops): ~32% chart.
  // Taller phones: ~42%, never above Orderly's 354 ceiling.
  const ratio = short ? 0.32 : 0.42;
  const fromRatio = Math.round(vh * ratio);
  // Also leave a fixed reserve for symbol bar + order book/entry + bottom nav.
  const reserve = short ? Math.round(vh * 0.62) : Math.round(vh * 0.52);
  const fromReserve = vh - reserve;
  return Math.max(160, Math.min(354, fromRatio, fromReserve));
}
`;

const HELPER_V1 = `
function idxMobileChartMaxHeight() {
  // ${MARKER}
  if (typeof window === "undefined") return 354;
  const vh = window.innerHeight || 800;
  // ~45% of viewport, never above Orderly's 354 ceiling
  return Math.max(176, Math.min(354, Math.round(vh * 0.45)));
}
`;

function patchDesktopMax(code) {
  const desktopV2 = `const dataListMinHeight = canTrade ? 379 : 277;
  const _idxVh = typeof window !== "undefined" ? window.innerHeight : 900;
  const tradindviewMaxHeight = Math.min(
    max2XL ? 1200 : 600,
    Math.max(
      240,
      _idxVh - 48 - 29 - dataListMinHeight - (max2XL ? 120 : 8)
    )
  ); // ${MARKER}_desktop_v2`;

  if (code.includes(`${MARKER}_desktop_v2`)) return code;

  // Upgrade v1 desktop clamp
  const desktopV1 = `const dataListMinHeight = canTrade ? 379 : 277;
  const tradindviewMaxHeight = Math.min(
    max2XL ? 1200 : 600,
    Math.max(
      280,
      (typeof window !== "undefined" ? window.innerHeight : 900) - 48 - 29 - dataListMinHeight - 8
    )
  ); // ${MARKER}`;
  if (code.includes(desktopV1)) {
    return code.replace(desktopV1, desktopV2);
  }

  const from = `const tradindviewMaxHeight = max2XL ? 1200 : 600;
  const dataListMinHeight = canTrade ? 379 : 277;`;
  if (!code.includes(from)) {
    console.warn("skip: desktop tradindviewMaxHeight block not found");
    return code;
  }
  return code.replace(from, desktopV2);
}

function patchHelper(code) {
  if (code.includes(HELPER_V2_MARK)) return code;

  // Upgrade v1 helper body in place
  if (code.includes(HELPER_V1.trim())) {
    return code.replace(HELPER_V1.trim(), HELPER.trim());
  }

  // Loose replace if formatting drifted
  const loose = /function idxMobileChartMaxHeight\(\) \{\n  \/\/ idx_chart_viewport_clamp\n[\s\S]*?\n\}/;
  if (loose.test(code)) {
    return code.replace(loose, HELPER.trim());
  }

  const anchor = "var MaxHeight, MinHeight, Key;";
  if (!code.includes(anchor)) {
    console.warn("skip: MaxHeight anchor not found");
    return code;
  }
  return code.replace(anchor, `${HELPER}${anchor}`);
}

/** Restore Orderly MaxHeight (354) so the mobile stretch bar can grow. */
function patchMobileDragCap(code) {
  const clamped = `Math.min(Math.max(Math.round(newHeight), MinHeight), idxMobileChartMaxHeight()) /* ${MARKER} */`;
  const original = `Math.min(Math.max(Math.round(newHeight), MinHeight), MaxHeight)`;
  if (code.includes(clamped)) {
    return code.replace(clamped, original);
  }
  return code;
}

/** Remove the resize effect that snapped chart height back to the viewport cap. */
function patchMobileResizeClamp(code, { useEffect }) {
  const inserted = `  ${useEffect}(() => {
    const clamp = () => {
      // ${MARKER}_resize
      const max = idxMobileChartMaxHeight();
      const cur = Number(height) || MaxHeight;
      const next = Math.min(Math.max(cur, Math.min(MinHeight, max)), max);
      if (next !== cur) setHeight(next);
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [height, setHeight]);
`;
  if (code.includes(inserted)) {
    return code.replace(inserted, "");
  }
  return code;
}

/**
 * Mobile UI is also used on iPad / narrow desktop — those use a mouse.
 * Orderly only wired touch, so the stretch bar did nothing with a cursor.
 */
function patchMobileMouseDrag(code, { useEffect }) {
  const mark = `${MARKER}_mouse`;
  if (code.includes(mark)) return code;

  const fromStart = `const event = e.touches[0];`;
  const toStart = `const event = e.touches ? e.touches[0] : e; /* ${mark} */`;
  if (!code.includes(fromStart)) {
    console.warn("skip: mobile drag touch point not found");
    return code;
  }
  code = code.replaceAll(fromStart, toStart);

  const fromListen = `    drag.addEventListener("touchstart", handleTouchStart);
    return () => {
      drag.removeEventListener("touchstart", handleTouchStart);
    };`;
  const toListen = `    drag.addEventListener("touchstart", handleTouchStart);
    drag.addEventListener("mousedown", handleTouchStart); /* ${mark} */
    return () => {
      drag.removeEventListener("touchstart", handleTouchStart);
      drag.removeEventListener("mousedown", handleTouchStart);
    };`;
  if (!code.includes(fromListen)) {
    console.warn("skip: mobile drag touchstart listener not found");
    return code;
  }
  code = code.replace(fromListen, toListen);

  const fromDoc = `    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };`;
  const toDoc = `    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mousemove", handleTouchMove); /* ${mark} */
    document.addEventListener("mouseup", handleTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mousemove", handleTouchMove);
      document.removeEventListener("mouseup", handleTouchEnd);
    };`;
  if (!code.includes(fromDoc)) {
    console.warn("skip: mobile drag document listeners not found");
    return code;
  }
  return code.replace(fromDoc, toDoc);
}

/**
 * Desktop mid-widths (~1280–1439): Orderly forces ~1440px minWidth + fullscreen
 * uses 100vw, which overflows. Cap width / fullscreen only.
 * Keep Orderly minScreenHeight so the page can scroll when chart is stretched
 * (standard desktop behavior).
 */
function patchDesktopShellWidth(code) {
  const fromMin = `minWidth: max4XL ? Math.max(1440 - scrollBarWidth, mainContentMinWidth + space * 2) : 1440 - scrollBarWidth`;
  const toMin = `minWidth: 0 /* ${MARKER}_shell_width */`;
  if (code.includes(fromMin)) {
    code = code.replaceAll(fromMin, toMin);
  }

  const fromFs = `tradingViewFullScreen && "oui-relative oui-h-[calc(100vh-80px)] oui-w-screen oui-overflow-hidden !oui-p-0"`;
  const toFs = `tradingViewFullScreen && "oui-relative oui-h-full oui-w-full oui-max-w-full oui-overflow-hidden !oui-p-0" /* ${MARKER}_shell_width */`;
  if (code.includes(fromFs)) {
    code = code.replace(fromFs, toFs);
  }

  // Restore standard shell minHeight if a prior clamp zeroed it
  if (code.includes(`minHeight: 0 /* ${MARKER}_shell_minh */`)) {
    code = code.replace(
      `minHeight: 0 /* ${MARKER}_shell_minh */,`,
      `minHeight: minScreenHeight,`,
    );
  }

  // Keep width fluid; restore SM column minHeight for scrollable content floor
  if (code.includes(`minHeight: 0 /* ${MARKER}_sm_minh */`)) {
    code = code.replace(
      `minHeight: 0 /* ${MARKER}_sm_minh */,
                      minWidth: 0 /* ${MARKER}_sm_minh */`,
      `minHeight: minScreenHeightSM - dataListMinHeight + 200,
                      minWidth: 0 /* ${MARKER}_shell_width */`,
    );
  } else if (code.includes(`minWidth: 1024 - scrollBarWidth`)) {
    code = code.replace(
      `minWidth: 1024 - scrollBarWidth`,
      `minWidth: 0 /* ${MARKER}_shell_width */`,
    );
  }

  return code;
}

function patch(code, api) {
  let next = code;
  next = patchDesktopMax(next);
  next = patchHelper(next);
  next = patchMobileDragCap(next);
  next = patchMobileResizeClamp(next, api);
  next = patchMobileMouseDrag(next, api);
  next = patchDesktopShellWidth(next);
  return next;
}

let changed = 0;
for (const { rel, ...api } of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn("skip missing", rel);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = patch(before, api);
  if (after === before) {
    console.log("unchanged", rel);
    continue;
  }
  if (!after.includes(MARKER)) {
    console.error("FAILED: clamp marker missing after patch", rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", rel);
}

console.log(`chart viewport clamp patch done (${changed} files updated)`);
