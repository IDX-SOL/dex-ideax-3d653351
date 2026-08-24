/**
 * Replace Orderly globe icon on Markets stat tiles + table headers with IDX grey mark SVG.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_markets_orderly_icon";
const ICON_W = 15;
const ICON_H = 16;

const IDX_PATHS = [
  "M 55.8 26.9 L 61.9 128.6 L 37.2 130.1 L 31.1 28.4 Z",
  "M 110.7 73.3 L 44.6 25.8 L 59.0 5.8 L 125.1 53.3 Z",
  "M 127.6 74.6 L 83.5 143.3 L 62.7 130.0 L 106.7 61.2 Z",
];

const FROM_ORDERLY_JS = `    OrderlyIcon = (props) => /* @__PURE__ */ jsxRuntime.jsx(
      "svg",
      {
        width: "12",
        height: "13",
        viewBox: "0 0 12 13",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /* @__PURE__ */ jsxRuntime.jsx(
          "path",
          {
            fillRule: "evenodd",
            clipRule: "evenodd",
            d: "M6.015.34h-.029a5.98 5.98 0 0 0-3.93 1.477c-.074.065-.027.184.072.184h7.745c.099 0 .146-.119.072-.184A5.98 5.98 0 0 0 6.015.341M3.48 7.866a.23.23 0 0 1 .187.1A2.85 2.85 0 0 0 6 9.178a2.85 2.85 0 0 0 2.334-1.213.23.23 0 0 1 .186-.1h3.104c.09 0 .155.086.13.172A6 6 0 0 1 6 12.327a6 6 0 0 1-5.755-4.29.134.134 0 0 1 .13-.172zM8.26 4.6a.29.29 0 0 0 .229.116h3.11c.09 0 .156-.086.13-.173a6 6 0 0 0-1.106-2.03.22.22 0 0 0-.165-.077H1.543a.22.22 0 0 0-.165.077 6 6 0 0 0-1.105 2.03.134.134 0 0 0 .13.173h3.11A.29.29 0 0 0 3.74 4.6 2.85 2.85 0 0 1 6 3.488c.92 0 1.738.436 2.26 1.112m.414 2.717c-.02.055.02.115.079.115h3.033a.135.135 0 0 0 .133-.112 6 6 0 0 0-.015-2.058.135.135 0 0 0-.133-.11H8.72c-.06 0-.1.061-.078.117a2.83 2.83 0 0 1 .032 2.048m-5.427.115c.06 0 .1-.06.079-.115a2.84 2.84 0 0 1 .032-2.048.085.085 0 0 0-.078-.118H.23a.135.135 0 0 0-.134.11A6 6 0 0 0 .08 7.32c.01.065.067.112.133.112z"
          }
        )
      }
    );`;

const FROM_IMG_JS = `    OrderlyIcon = (props) => /* @__PURE__ */ jsxRuntime.jsx(
      "img",
      {
        src: "/logo-secondary.webp",
        alt: "",
        width: 12,
        height: 13,
        style: { display: "inline-block", verticalAlign: "middle", flexShrink: 0 },
        ...props /* ${MARKER} */
      }
    );`;

function buildIdxIconJsx(runtime) {
  const jsx = `${runtime}.jsx`;
  const jsxs = `${runtime}.jsxs`;
  return `    OrderlyIcon = (props) => /* @__PURE__ */ ${jsxs}(
      "svg",
      {
        width: ${ICON_W},
        height: ${ICON_H},
        viewBox: "0 0 150 150",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
          /* @__PURE__ */ ${jsx}("path", { fill: "#AFADB0", d: "${IDX_PATHS[0]}" }),
          /* @__PURE__ */ ${jsx}("path", { fill: "#AFADB0", d: "${IDX_PATHS[1]}" }),
          /* @__PURE__ */ ${jsx}("path", { fill: "#AFADB0", d: "${IDX_PATHS[2]}" })
        ] /* ${MARKER} */
      }
    );`;
}

const TO_JS = buildIdxIconJsx("jsxRuntime");
const TO_MJS = buildIdxIconJsx("jsx");

const FROM_IDX_JS = buildIdxIconJsx("jsxRuntime").replace(
  `width: ${ICON_W}`,
  "width: 12",
).replace(`height: ${ICON_H}`, "height: 13");

const FROM_IDX_MJS = buildIdxIconJsx("jsx").replace(
  `width: ${ICON_W}`,
  "width: 12",
).replace(`height: ${ICON_H}`, "height: 13");

const FROM_ORDERLY_MJS = FROM_ORDERLY_JS
  .replaceAll("jsxRuntime.jsx", "jsx")
  .replaceAll("jsxRuntime.jsxs", "jsxs");

const FROM_IMG_MJS = FROM_IMG_JS
  .replaceAll("jsxRuntime.jsx", "jsx")
  .replaceAll("jsxRuntime.jsxs", "jsxs");

function patchFile(filePath, fromCandidates, to) {
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", path.relative(root, filePath));
    return false;
  }
  const before = fs.readFileSync(filePath, "utf8");
  if (
    before.includes(MARKER) &&
    before.includes(`width: ${ICON_W}`) &&
    before.includes(`height: ${ICON_H}`)
  ) {
    console.log("unchanged", path.relative(root, filePath));
    return false;
  }
  if (
    before.includes(MARKER) &&
    before.includes("width: 12") &&
    before.includes("height: 13")
  ) {
    const orderlyIconResize = /OrderlyIcon = \(props\) =>[\s\S]*?width: 12,\s*\n\s*height: 13,/;
    if (!orderlyIconResize.test(before)) {
      console.error("FAILED: OrderlyIcon resize pattern not found", path.relative(root, filePath));
      return false;
    }
    const next = before.replace(
      orderlyIconResize,
      (block) =>
        block.replace("width: 12,", `width: ${ICON_W},`).replace("height: 13,", `height: ${ICON_H},`),
    );
    fs.writeFileSync(filePath, next);
    console.log("resized", path.relative(root, filePath));
    return true;
  }
  let from = null;
  for (const candidate of fromCandidates) {
    if (before.includes(candidate)) {
      from = candidate;
      break;
    }
  }
  if (!from) {
    console.error("FAILED: pattern not found", path.relative(root, filePath));
    return false;
  }
  const next = before.replace(from, to);
  if (next === before) return false;
  fs.writeFileSync(filePath, next);
  console.log("patched", path.relative(root, filePath));
  return true;
}

const js = path.join(
  root,
  "node_modules/@orderly.network/markets/dist/index.js",
);
const mjs = path.join(
  root,
  "node_modules/@orderly.network/markets/dist/index.mjs",
);

let changed = 0;
if (patchFile(js, [FROM_IDX_JS, FROM_IMG_JS, FROM_ORDERLY_JS], TO_JS))
  changed += 1;
if (patchFile(mjs, [FROM_IDX_MJS, FROM_IMG_MJS, FROM_ORDERLY_MJS], TO_MJS))
  changed += 1;

console.log(`markets orderly icon patch done (${changed} files updated)`);
