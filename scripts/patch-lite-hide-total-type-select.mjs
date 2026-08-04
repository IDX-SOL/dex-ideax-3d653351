/**
 * Lite: hide Order size / Initial margin switch; force Order size + static label.
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_lite_hide_total_type_select";

function writeIfChanged(filePath, next) {
  const prev = fs.readFileSync(filePath, "utf8");
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function patchMjs(code) {
  if (code.includes(MARKER)) return code;

  const needle = `  const [totalType, setTotalType] = useLocalStorage(
    "orderly_order_total_type",
    "orderSize" /* OrderSize */
  );
  useEffect(() => {
    if (total) {
      if (currentFocusInput !== 6 /* MARGIN */) {
        const margin2 = new Decimal(total).div(leverage).todp(2).toString();
        setMargin(margin2);
      }
    } else {
      setMargin("");
    }
  }, [total, leverage, currentFocusInput]);
  const onMarginChange = (val) => {
    const total2 = val ? new Decimal(val).mul(leverage).toString() : "";
    setOrderValue("total", total2);
    setMargin(val);
  };
  const prefix = /* @__PURE__ */ jsx(TotalTypeSelect, { value: totalType, onChange: setTotalType });
  if (totalType === "initialMargin" /* InitialMargin */) {`;

  const insert = `  const [totalType, setTotalType] = useLocalStorage(
    "orderly_order_total_type",
    "orderSize" /* OrderSize */
  );
  // ${MARKER}
  const [idxTradingModeTotal, setIdxTradingModeTotal] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "lite" : "pro"
  );
  useEffect(() => {
    const onChange = (event) => {
      const next = event?.detail?.mode;
      if (next === "lite" || next === "pro") setIdxTradingModeTotal(next);
    };
    window.addEventListener("idx-dex-trading-mode-change", onChange);
    return () => window.removeEventListener("idx-dex-trading-mode-change", onChange);
  }, []);
  const idxLiteTotal = idxTradingModeTotal === "lite";
  const effectiveTotalType = idxLiteTotal ? "orderSize" /* OrderSize */ : totalType;
  useEffect(() => {
    if (total) {
      if (currentFocusInput !== 6 /* MARGIN */) {
        const margin2 = new Decimal(total).div(leverage).todp(2).toString();
        setMargin(margin2);
      }
    } else {
      setMargin("");
    }
  }, [total, leverage, currentFocusInput]);
  const onMarginChange = (val) => {
    const total2 = val ? new Decimal(val).mul(leverage).toString() : "";
    setOrderValue("total", total2);
    setMargin(val);
  };
  const prefix = idxLiteTotal ? void 0 : /* @__PURE__ */ jsx(TotalTypeSelect, { value: totalType, onChange: setTotalType });
  if (effectiveTotalType === "initialMargin" /* InitialMargin */) {`;

  if (!code.includes(needle)) {
    console.error("mjs: TotalInput insert point not found");
    return code;
  }
  return code.replace(needle, insert);
}

function patchJs(code) {
  if (code.includes(MARKER)) return code;

  const needle = `  const [totalType, setTotalType] = hooks.useLocalStorage(
    "orderly_order_total_type",
    "orderSize" /* OrderSize */
  );
  React3.useEffect(() => {
    if (total) {
      if (currentFocusInput !== 6 /* MARGIN */) {
        const margin2 = new utils.Decimal(total).div(leverage).todp(2).toString();
        setMargin(margin2);
      }
    } else {
      setMargin("");
    }
  }, [total, leverage, currentFocusInput]);
  const onMarginChange = (val) => {
    const total2 = val ? new utils.Decimal(val).mul(leverage).toString() : "";
    setOrderValue("total", total2);
    setMargin(val);
  };
  const prefix = /* @__PURE__ */ jsxRuntime.jsx(TotalTypeSelect, { value: totalType, onChange: setTotalType });
  if (totalType === "initialMargin" /* InitialMargin */) {`;

  const insert = `  const [totalType, setTotalType] = hooks.useLocalStorage(
    "orderly_order_total_type",
    "orderSize" /* OrderSize */
  );
  // ${MARKER}
  const [idxTradingModeTotal, setIdxTradingModeTotal] = React3.useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "lite" : "pro"
  );
  React3.useEffect(() => {
    const onChange = (event) => {
      const next = event?.detail?.mode;
      if (next === "lite" || next === "pro") setIdxTradingModeTotal(next);
    };
    window.addEventListener("idx-dex-trading-mode-change", onChange);
    return () => window.removeEventListener("idx-dex-trading-mode-change", onChange);
  }, []);
  const idxLiteTotal = idxTradingModeTotal === "lite";
  const effectiveTotalType = idxLiteTotal ? "orderSize" /* OrderSize */ : totalType;
  React3.useEffect(() => {
    if (total) {
      if (currentFocusInput !== 6 /* MARGIN */) {
        const margin2 = new utils.Decimal(total).div(leverage).todp(2).toString();
        setMargin(margin2);
      }
    } else {
      setMargin("");
    }
  }, [total, leverage, currentFocusInput]);
  const onMarginChange = (val) => {
    const total2 = val ? new utils.Decimal(val).mul(leverage).toString() : "";
    setOrderValue("total", total2);
    setMargin(val);
  };
  const prefix = idxLiteTotal ? void 0 : /* @__PURE__ */ jsxRuntime.jsx(TotalTypeSelect, { value: totalType, onChange: setTotalType });
  if (effectiveTotalType === "initialMargin" /* InitialMargin */) {`;

  if (!code.includes(needle)) {
    console.error("js: TotalInput insert point not found");
    return code;
  }
  return code.replace(needle, insert);
}

const targets = [
  {
    file: path.join(root, "node_modules/@orderly.network/ui-order-entry/dist/index.mjs"),
    patch: patchMjs,
  },
  {
    file: path.join(root, "node_modules/@orderly.network/ui-order-entry/dist/index.js"),
    patch: patchJs,
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
  if (!next.includes(MARKER)) {
    console.error("FAILED: marker missing", file);
    continue;
  }
  if (writeIfChanged(file, next)) {
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`lite hide total type select patch done (${changed} files updated)`);
