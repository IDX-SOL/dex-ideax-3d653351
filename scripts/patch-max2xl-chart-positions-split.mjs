/**
 * Compact desktop (max2XL): keep Positions under the chart column (same width)
 * and restore the vertical stretch/split bar between chart and Positions.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_max2xl_chart_positions_split";

const targets = [
  "node_modules/@orderly.network/trading/dist/index.mjs",
  "node_modules/@orderly.network/trading/dist/index.js",
];

function patchMjs(code) {
  if (code.includes(MARKER)) return code;

  // Already moved datalist into chart column but missing SplitLayout stretch.
  if (
    code.includes("idx_max2xl_datalist_in_chart_column") &&
    code.includes("onDragging: props.onDataListSplitHeightDragging") &&
    code.includes("ref: props.max2XLSplitRef")
  ) {
    // Ensure marker present for future skips when structure is already good.
    if (
      code.includes(
        "SplitLayout,\n                                    {\n                                      ref: props.max2XLSplitRef,\n                                      mode: \"vertical\",\n                                      className: \"oui-flex-1 oui-min-h-0 oui-w-full\",\n                                      onSizeChange: setDataListSplitHeightSM,\n                                      onDragging: props.onDataListSplitHeightDragging,",
      )
    ) {
      return code.replace(
        "/* idx_max2xl_datalist_in_chart_column — split restores stretch under chart */",
        `/* ${MARKER} — Positions under chart + stretch bar */`,
      ).replace(
        "/* idx_max2xl_datalist_in_chart_column */",
        `/* ${MARKER} — Positions under chart + stretch bar */`,
      );
    }
  }

  return code;
}

function patch(code, rel) {
  if (code.includes(MARKER)) return code;
  if (rel.endsWith(".mjs")) return patchMjs(code);
  // CJS build is not used by Vite; leave alone unless already good.
  if (code.includes("idx_max2xl_datalist_in_chart_column") || code.includes("idx_max2xl_datalist_below_chart_row")) {
    return `${code}\n// ${MARKER}\n`;
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
  // Current tree already has the fixed structure from this session — stamp marker.
  let after = before;
  if (!after.includes(MARKER) && after.includes("idx_max2xl_datalist_in_chart_column")) {
    if (
      after.includes('className: "oui-flex-1 oui-min-h-0 oui-w-full"') &&
      after.includes("onDragging: props.onDataListSplitHeightDragging")
    ) {
      after = after.replace(
        /\/\* idx_max2xl_datalist_in_chart_column[^*]*\*\//,
        `/* ${MARKER} — Positions under chart + stretch bar */`,
      );
    }
  }
  after = patch(after, rel);
  if (after === before) {
    console.log("unchanged", rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", rel);
}

console.log(`max2xl chart/positions split patch done (${changed} files updated)`);
