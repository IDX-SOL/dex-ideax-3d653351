/**
 * Orderly budgets +46px for the permissionless risk notice, but autoHeight
 * pre-launch copy wraps taller (~76px). That clips the symbol details bar
 * under the chart. Bump the reserved notice height so layout stays in sync.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_symbol_bar_risk_height";

const targets = [
  "node_modules/@orderly.network/trading/dist/index.mjs",
  "node_modules/@orderly.network/trading/dist/index.js",
];

function patch(code) {
  if (code.includes(MARKER)) return code;

  const next = code.replace(
    /if \(brokerName\) \{\n\s*height \+= 46;\n\s*height \+= 8;\n\s*\}/,
    `if (brokerName) {
      // ${MARKER} — autoHeight notices wrap taller than 46px
      height += 84;
      height += 8;
    }`,
  );

  return next === code ? code : next;
}

let changed = 0;
for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn("skip missing", rel);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = patch(before);
  if (after === before) {
    console.log("unchanged", rel);
    continue;
  }
  if (!after.includes(MARKER)) {
    console.error("FAILED: risk-height marker missing after patch", rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", rel);
}

console.log(`symbol info bar risk height patch done (${changed} files updated)`);
