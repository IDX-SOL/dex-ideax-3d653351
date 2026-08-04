/**
 * Allow Isolated / Leverage / Market / Limit when wallet is disconnected.
 * (SDK disables these via !canTrade.)
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

function patchOrderEntry(code) {
  if (code.includes("idx_allow_disconnected_order_controls")) return code;

  let next = code;

  // Market / Limit tabs (desktop) — keep Advanced gated
  next = next.replace(
    /onClick: \(\) => handleChange\(OrderType\.LIMIT\),\n              disabled: !props\.canTrade,\n              "data-testid": "oui-testid-orderEntry-orderType-limit",/,
    `onClick: () => handleChange(OrderType.LIMIT),\n              // idx_allow_disconnected_order_controls\n              disabled: false,\n              "data-testid": "oui-testid-orderEntry-orderType-limit",`,
  );
  next = next.replace(
    /onClick: \(\) => handleChange\(types\.OrderType\.LIMIT\),\n              disabled: !props\.canTrade,\n              "data-testid": "oui-testid-orderEntry-orderType-limit",/,
    `onClick: () => handleChange(types.OrderType.LIMIT),\n              // idx_allow_disconnected_order_controls\n              disabled: false,\n              "data-testid": "oui-testid-orderEntry-orderType-limit",`,
  );

  next = next.replace(
    /onClick: \(\) => handleChange\(OrderType\.MARKET\),\n              disabled: !props\.canTrade,\n              "data-testid": "oui-testid-orderEntry-orderType-market",/,
    `onClick: () => handleChange(OrderType.MARKET),\n              disabled: false,\n              "data-testid": "oui-testid-orderEntry-orderType-market",`,
  );
  next = next.replace(
    /onClick: \(\) => handleChange\(types\.OrderType\.MARKET\),\n              disabled: !props\.canTrade,\n              "data-testid": "oui-testid-orderEntry-orderType-market",/,
    `onClick: () => handleChange(types.OrderType.MARKET),\n              disabled: false,\n              "data-testid": "oui-testid-orderEntry-orderType-market",`,
  );

  // Isolated + Leverage badge
  next = next.replace(
    /LeverageBadge,\n      \{\n        symbol: props\.symbol,\n        side: props\.side,\n        symbolLeverage: props\.symbolLeverage,\n        marginMode: props\.marginMode,\n        disabled: !props\.canTrade\n      \}/,
    `LeverageBadge,\n      {\n        symbol: props.symbol,\n        side: props.side,\n        symbolLeverage: props.symbolLeverage,\n        marginMode: props.marginMode,\n        disabled: false\n      }`,
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
  const next = patchOrderEntry(before);
  if (next === before) {
    console.log("unchanged", path.relative(root, file));
    continue;
  }
  if (!next.includes("idx_allow_disconnected_order_controls")) {
    console.error("FAILED: marker missing", file);
    continue;
  }
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(
  `allow disconnected order controls patch done (${changed} files updated)`,
);
