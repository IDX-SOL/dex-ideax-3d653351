/**
 * Show "Leverage" label on the order-entry leverage button (was value-only, e.g. "1x").
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_leverage_button_label";

const FROM_MJS = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsx(
              Text.numeral,
              {
                dp: 0,
                rm: Decimal.ROUND_DOWN,
                unit: "x",
                unitClassName: "oui-ms-0",
                children: curLeverage
              }
            )`;

const TO_MJS = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("span", { children: "Leverage" /* ${MARKER} */ }),
              /* @__PURE__ */ jsx(
                Text.numeral,
                {
                  dp: 0,
                  rm: Decimal.ROUND_DOWN,
                  unit: "x",
                  unitClassName: "oui-ms-0",
                  children: curLeverage
                }
              )
            ] })`;

const FROM_JS = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              ui.Text.numeral,
              {
                dp: 0,
                rm: utils.Decimal.ROUND_DOWN,
                unit: "x",
                unitClassName: "oui-ms-0",
                children: curLeverage
              }
            )`;

const TO_JS = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { children: "Leverage" /* ${MARKER} */ }),
              /* @__PURE__ */ jsxRuntime.jsx(
                ui.Text.numeral,
                {
                  dp: 0,
                  rm: utils.Decimal.ROUND_DOWN,
                  unit: "x",
                  unitClassName: "oui-ms-0",
                  children: curLeverage
                }
              )
            ] })`;

function writeIfChanged(filePath, next) {
  const prev = fs.readFileSync(filePath, "utf8");
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function patchFile(filePath, from, to) {
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", filePath);
    return false;
  }
  const before = fs.readFileSync(filePath, "utf8");
  if (before.includes(MARKER)) {
    console.log("unchanged", path.relative(root, filePath));
    return false;
  }
  if (!before.includes(from)) {
    // Try alternate Text.numeral import style in .js
    console.error("FAILED: pattern not found", path.relative(root, filePath));
    return false;
  }
  const next = before.replace(from, to);
  if (writeIfChanged(filePath, next)) {
    console.log("patched", path.relative(root, filePath));
    return true;
  }
  return false;
}

const mjs = path.join(
  root,
  "node_modules/@orderly.network/ui-order-entry/dist/index.mjs",
);
const js = path.join(
  root,
  "node_modules/@orderly.network/ui-order-entry/dist/index.js",
);

let changed = 0;
if (patchFile(mjs, FROM_MJS, TO_MJS)) changed += 1;

// .js may use Text.numeral without ui. prefix — detect
let jsFrom = FROM_JS;
let jsTo = TO_JS;
if (fs.existsSync(js)) {
  const raw = fs.readFileSync(js, "utf8");
  if (!raw.includes(FROM_JS) && raw.includes('"oui-testid-orderEntry-leverage"')) {
    // Fall back: match whatever Text.numeral variant is present around the test id
    const altFrom = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsxRuntime.jsx(
              Text.numeral,
              {
                dp: 0,
                rm: Decimal.ROUND_DOWN,
                unit: "x",
                unitClassName: "oui-ms-0",
                children: curLeverage
              }
            )`;
    const altTo = `"data-testid": "oui-testid-orderEntry-leverage",
            children: /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { children: "Leverage" /* ${MARKER} */ }),
              /* @__PURE__ */ jsxRuntime.jsx(
                Text.numeral,
                {
                  dp: 0,
                  rm: Decimal.ROUND_DOWN,
                  unit: "x",
                  unitClassName: "oui-ms-0",
                  children: curLeverage
                }
              )
            ] })`;
    if (raw.includes(altFrom)) {
      jsFrom = altFrom;
      jsTo = altTo;
    }
  }
}
if (patchFile(js, jsFrom, jsTo)) changed += 1;

console.log(`leverage button label patch done (${changed} files updated)`);
