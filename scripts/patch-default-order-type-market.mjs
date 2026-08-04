/**
 * Default order type: Market (not Limit).
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
  if (code.includes("idx_default_order_type_market")) return code;

  let next = code.replace(
    /const \[localOrderType, setLocalOrderType\] = useLocalStorage\(\n    "orderly-order-entry-order-type",\n    OrderType\.LIMIT\n  \);/,
    `// idx_default_order_type_market
  const [localOrderType, setLocalOrderType] = useLocalStorage(
    "orderly-order-entry-order-type",
    OrderType.MARKET
  );`,
  );

  // CJS (hooks.useLocalStorage, possibly same-line args)
  next = next.replace(
    /const \[localOrderType, setLocalOrderType\] = hooks\.useLocalStorage\(\n    "orderly-order-entry-order-type",\n    types\.OrderType\.LIMIT\n  \);/,
    `// idx_default_order_type_market
  const [localOrderType, setLocalOrderType] = hooks.useLocalStorage(
    "orderly-order-entry-order-type",
    types.OrderType.MARKET
  );`,
  );
  next = next.replace(
    /hooks\.useLocalStorage\(\s*"orderly-order-entry-order-type",\s*types\.OrderType\.LIMIT\s*\)/,
    `hooks.useLocalStorage(\n    "orderly-order-entry-order-type",\n    types.OrderType.MARKET\n  )`,
  );

  return next;
}

function patchHooks(code) {
  let next = code;

  if (!next.includes("idx_default_order_type_market_hooks")) {
    next = next.replace(
      /order_type: OrderType\.LIMIT,\n  margin_mode: MarginMode\.(ISOLATED|CROSS)\n\};/,
      `order_type: OrderType.MARKET,\n  // idx_default_order_type_market_hooks\n  margin_mode: MarginMode.$1\n};`,
    );
    next = next.replace(
      /order_type: types\.OrderType\.LIMIT,\n  margin_mode: types\.MarginMode\.(ISOLATED|CROSS)\n\};/,
      `order_type: types.OrderType.MARKET,\n  // idx_default_order_type_market_hooks\n  margin_mode: types.MarginMode.$1\n};`,
    );
  }

  next = next.replace(
    /order_type: opts\?\.order_type \?\? OrderType\.LIMIT,/g,
    `order_type: opts?.order_type ?? OrderType.MARKET,`,
  );
  next = next.replace(
    /order_type: opts\?\.order_type \?\? types\.OrderType\.LIMIT,/g,
    `order_type: opts?.order_type ?? types.OrderType.MARKET,`,
  );

  next = next.replace(
    /order_type: options\?\.order_type \?\? OrderType\.LIMIT,/g,
    `order_type: options?.order_type ?? OrderType.MARKET,`,
  );
  next = next.replace(
    /order_type: options\?\.order_type \?\? types\.OrderType\.LIMIT,/g,
    `order_type: options?.order_type ?? types.OrderType.MARKET,`,
  );

  // useOrderStore entry seed
  next = next.replace(
    /side: OrderSide\.BUY,\n      order_type: OrderType\.LIMIT,\n      \.\.\.initialOrderState2/,
    `side: OrderSide.BUY,\n      order_type: OrderType.MARKET,\n      ...initialOrderState2`,
  );
  next = next.replace(
    /side: types\.OrderSide\.BUY,\n      order_type: types\.OrderType\.LIMIT,\n      \.\.\.initialOrderState2/,
    `side: types.OrderSide.BUY,\n      order_type: types.OrderType.MARKET,\n      ...initialOrderState2`,
  );

  return next;
}

const targets = [
  {
    file: path.join(
      root,
      "node_modules/@orderly.network/ui-order-entry/dist/index.mjs",
    ),
    patch: patchOrderEntry,
  },
  {
    file: path.join(
      root,
      "node_modules/@orderly.network/ui-order-entry/dist/index.js",
    ),
    patch: patchOrderEntry,
  },
  {
    file: path.join(root, "node_modules/@orderly.network/hooks/dist/index.mjs"),
    patch: patchHooks,
  },
  {
    file: path.join(root, "node_modules/@orderly.network/hooks/dist/index.js"),
    patch: patchHooks,
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
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`default order type Market patch done (${changed} files updated)`);
