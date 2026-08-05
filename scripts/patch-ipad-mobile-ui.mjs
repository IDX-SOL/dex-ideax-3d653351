/**
 * Mobile UI for phones, iPads, and narrow desktops (Orderly max2XL ≤1279.98px).
 * Avoids the broken compact-desktop trading shell; laptops ≥1280 stay desktop.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_ipad_mobile_ui";
const MARKER_V2 = "idx_ipad_mobile_ui_v2";
const NARROW_MQ = "(max-width: 1279.98px)";

const targets = [
  "node_modules/@orderly.network/ui/dist/index.mjs",
  "node_modules/@orderly.network/ui/dist/index.js",
];

const FROM_STOCK = `function useScreen() {
  const isMobile = useMediaQuery("(max-width: 1023.98px)");
  return {
    isMobile,
    isDesktop: !isMobile
  };
}`;

const FROM_V1_MJS = `function isIPadTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
} // ${MARKER}

function useScreen() {
  const narrowViewport = useMediaQuery("(max-width: 1023.98px)");
  const isIPad = useMemo(() => isIPadTablet(), []);
  const isMobile = narrowViewport || isIPad;
  return {
    isMobile,
    isDesktop: !isMobile
  };
}`;

const FROM_V1_JS = `function isIPadTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
} // ${MARKER}

function useScreen() {
  const narrowViewport = useMediaQuery("(max-width: 1023.98px)");
  const isIPad = React73.useMemo(() => isIPadTablet(), []);
  const isMobile = narrowViewport || isIPad;
  return {
    isMobile,
    isDesktop: !isMobile
  };
}`;

const TO_MJS = `function isIPadTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
} // ${MARKER_V2}

function useScreen() {
  // max2XL / narrow desktop (≤1279.98) + iPad → mobile layout
  const narrowViewport = useMediaQuery("${NARROW_MQ}");
  const isIPad = useMemo(() => isIPadTablet(), []);
  const isMobile = narrowViewport || isIPad;
  return {
    isMobile,
    isDesktop: !isMobile
  };
}`;

const TO_JS = `function isIPadTablet() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
} // ${MARKER_V2}

function useScreen() {
  // max2XL / narrow desktop (≤1279.98) + iPad → mobile layout
  const narrowViewport = useMediaQuery("${NARROW_MQ}");
  const isIPad = React73.useMemo(() => isIPadTablet(), []);
  const isMobile = narrowViewport || isIPad;
  return {
    isMobile,
    isDesktop: !isMobile
  };
}`;

function patch(code, rel) {
  if (code.includes(MARKER_V2)) return code;

  const to = rel.endsWith(".js") ? TO_JS : TO_MJS;
  const fromV1 = rel.endsWith(".js") ? FROM_V1_JS : FROM_V1_MJS;

  if (code.includes(fromV1)) {
    return code.replace(fromV1, to);
  }
  if (code.includes(FROM_STOCK)) {
    return code.replace(FROM_STOCK, to);
  }

  // Fallback: widen an already-patched 1023.98 query if marker text differs slightly
  if (code.includes(MARKER) && code.includes("(max-width: 1023.98px)")) {
    return code
      .replaceAll("(max-width: 1023.98px)", NARROW_MQ)
      .replace(`// ${MARKER}`, `// ${MARKER_V2}`);
  }

  return code;
}

let changed = 0;
for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn("skip missing", rel);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = patch(before, rel);
  if (after === before) {
    console.log("unchanged", rel);
    continue;
  }
  if (!after.includes(MARKER_V2) && !after.includes(NARROW_MQ)) {
    console.error("FAILED: narrow mobile query missing after patch", rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", rel);
}

console.log(`iPad/narrow-desktop mobile UI patch done (${changed} files updated)`);
