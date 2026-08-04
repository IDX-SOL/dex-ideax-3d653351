/**
 * Default margin mode: Isolated (not Cross) when the account has no
 * saved per-symbol preference from Orderly.
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

function patchHooks(code) {
  if (code.includes("idx_default_margin_isolated")) return code;

  let next = code;

  // Primary: useMarginModeBySymbol fallback when API has no preference (ESM + CJS)
  next = next.replace(
    /var useMarginModeBySymbol = \(symbol, fallback = MarginMode\.CROSS\) => \{/,
    `// idx_default_margin_isolated
var useMarginModeBySymbol = (symbol, fallback = MarginMode.ISOLATED) => {`,
  );
  next = next.replace(
    /var useMarginModeBySymbol = \(symbol, fallback = types\.MarginMode\.CROSS\) => \{/,
    `// idx_default_margin_isolated
var useMarginModeBySymbol = (symbol, fallback = types.MarginMode.ISOLATED) => {`,
  );

  // Order-entry initial state / init helpers (avoid Cross flash before sync)
  next = next.replace(
    /order_type: OrderType\.LIMIT,\n  margin_mode: MarginMode\.CROSS\n\};/,
    `order_type: OrderType.LIMIT,\n  margin_mode: MarginMode.ISOLATED\n};`,
  );
  next = next.replace(
    /order_type: types\.OrderType\.LIMIT,\n  margin_mode: types\.MarginMode\.CROSS\n\};/,
    `order_type: types.OrderType.LIMIT,\n  margin_mode: types.MarginMode.ISOLATED\n};`,
  );

  next = next.replace(
    /margin_mode: opts\?\.margin_mode \?\? MarginMode\.CROSS\n        \}\);/,
    `margin_mode: opts?.margin_mode ?? MarginMode.ISOLATED\n        });`,
  );
  next = next.replace(
    /margin_mode: opts\?\.margin_mode \?\? types\.MarginMode\.CROSS\n        \}\);/,
    `margin_mode: opts?.margin_mode ?? types.MarginMode.ISOLATED\n        });`,
  );

  next = next.replace(
    /const effectiveMarginMode = options\?\.initialOrder\?\.margin_mode \?\? MarginMode\.CROSS;/,
    `const effectiveMarginMode = options?.initialOrder?.margin_mode ?? MarginMode.ISOLATED;`,
  );
  next = next.replace(
    /const effectiveMarginMode = options\?\.initialOrder\?\.margin_mode \?\? types\.MarginMode\.CROSS;/,
    `const effectiveMarginMode = options?.initialOrder?.margin_mode ?? types.MarginMode.ISOLATED;`,
  );

  // useOrderStore initOrder default
  next = next.replace(
    /margin_mode: options\?\.margin_mode \?\? MarginMode\.CROSS\n          \};/,
    `margin_mode: options?.margin_mode ?? MarginMode.ISOLATED\n          };`,
  );
  next = next.replace(
    /margin_mode: options\?\.margin_mode \?\? types\.MarginMode\.CROSS\n          \};/,
    `margin_mode: options?.margin_mode ?? types.MarginMode.ISOLATED\n          };`,
  );

  return next;
}

const targets = [
  path.join(root, "node_modules/@orderly.network/hooks/dist/index.mjs"),
  path.join(root, "node_modules/@orderly.network/hooks/dist/index.js"),
];

let changed = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.warn("skip missing", file);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const next = patchHooks(before);
  if (next === before) {
    console.log("unchanged", path.relative(root, file));
    continue;
  }
  if (!next.includes("idx_default_margin_isolated")) {
    console.error("FAILED: marker missing", file);
    continue;
  }
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`default margin Isolated patch done (${changed} files updated)`);
