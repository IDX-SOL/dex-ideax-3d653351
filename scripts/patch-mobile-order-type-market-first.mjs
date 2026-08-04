/**
 * Mobile order-type dropdown: Market first, then Limit, then advanced types.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_mobile_order_type_market_first";

function writeIfChanged(filePath, next) {
  const prev = fs.readFileSync(filePath, "utf8");
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function patch(code) {
  if (code.includes(MARKER)) return code;

  let next = code.replace(
    /return \[\n      \{ label: t\("orderEntry\.orderType\.limitOrder"\), value: OrderType\.LIMIT \},\n      \{ label: t\("orderEntry\.orderType\.marketOrder"\), value: OrderType\.MARKET \},/,
    `return [\n      // ${MARKER}\n      { label: t("orderEntry.orderType.marketOrder"), value: OrderType.MARKET },\n      { label: t("orderEntry.orderType.limitOrder"), value: OrderType.LIMIT },`,
  );

  next = next.replace(
    /return \[\n      \{ label: t\("orderEntry\.orderType\.limitOrder"\), value: types\.OrderType\.LIMIT \},\n      \{ label: t\("orderEntry\.orderType\.marketOrder"\), value: types\.OrderType\.MARKET \},/,
    `return [\n      // ${MARKER}\n      { label: t("orderEntry.orderType.marketOrder"), value: types.OrderType.MARKET },\n      { label: t("orderEntry.orderType.limitOrder"), value: types.OrderType.LIMIT },`,
  );

  return next;
}

const targets = [
  path.join(root, "node_modules/@orderly.network/ui-order-entry/dist/index.mjs"),
  path.join(root, "node_modules/@orderly.network/ui-order-entry/dist/index.js"),
];

let changed = 0;
for (const file of targets) {
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
  if (!next.includes(MARKER)) {
    console.error("FAILED: marker missing", file);
    continue;
  }
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`mobile order type Market-first patch done (${changed} files updated)`);
