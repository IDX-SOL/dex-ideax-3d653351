/**
 * Treat iPad as mobile (WalletConnect / no extension wallets) while laptops stay desktop.
 * Extends useScreen: narrow viewport OR iPad device detection.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_ipad_mobile_ui";

const targets = [
  "node_modules/@orderly.network/ui/dist/index.mjs",
  "node_modules/@orderly.network/ui/dist/index.js",
];

const FROM = `function useScreen() {
  const isMobile = useMediaQuery("(max-width: 1023.98px)");
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

const TO_JS = `function isIPadTablet() {
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

function patch(code, rel) {
  if (code.includes(MARKER)) return code;
  const to = rel.endsWith(".js") ? TO_JS : TO_MJS;
  const next = code.replace(FROM, to);
  return next.includes(MARKER) ? next : code;
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
  if (!after.includes(MARKER)) {
    console.error("FAILED: marker missing after patch", rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", rel);
}

console.log(`iPad mobile UI patch done (${changed} files updated)`);
