/**
 * Mobile Lite: Market | Limit side-by-side tabs instead of order-type dropdown.
 * Pro mobile keeps the Select dropdown. Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_lite_mobile_order_type_tabs";

function writeIfChanged(filePath, next) {
  const prev = fs.readFileSync(filePath, "utf8");
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function patchMjs(code) {
  if (code.includes(MARKER)) return code;

  const hookNeedle = `  const mobileOptions = useMemo(() => allOptions, [allOptions]);
  if (!isMobile) {`;
  const hookInsert = `  const mobileOptions = useMemo(() => allOptions, [allOptions]);
  // ${MARKER}
  const [idxTradingMode, setIdxTradingMode] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "lite" : "pro"
  );
  useEffect(() => {
    const onChange = (event) => {
      const next = event?.detail?.mode;
      if (next === "lite" || next === "pro") setIdxTradingMode(next);
    };
    window.addEventListener("idx-dex-trading-mode-change", onChange);
    return () => window.removeEventListener("idx-dex-trading-mode-change", onChange);
  }, []);
  useEffect(() => {
    if (idxTradingMode !== "lite") return;
    if (props.type !== OrderType.MARKET && props.type !== OrderType.LIMIT) {
      props.onChange(OrderType.MARKET);
    }
  }, [idxTradingMode]);
  if (!isMobile) {`;

  if (!code.includes(hookNeedle)) {
    console.error("mjs: hook insert point not found");
    return code;
  }
  let next = code.replace(hookNeedle, hookInsert);

  const liteBlock = `  // ${MARKER}: lite mobile = Market | Limit tabs
  if (idxTradingMode === "lite") {
    const baseButtonClassName = "oui-flex oui-flex-1 oui-items-center oui-justify-center oui-gap-x-1 oui-rounded oui-px-3 oui-py-0.5 oui-text-xs oui-font-semibold oui-h-8";
    const selectedButtonClassName = cn(
      baseButtonClassName,
      "oui-bg-base-5 oui-text-base-contrast"
    );
    const unselectedButtonClassName = cn(
      baseButtonClassName,
      "oui-bg-base-7 oui-text-base-contrast-36"
    );
    const handleLiteChange = (type) => {
      if (marketOrderDisabled && type === OrderType.MARKET && marketOrderDisabledTooltip) {
        modal.alert({
          title: t("common.tips"),
          message: marketOrderDisabledTooltip
        });
        return;
      }
      props.onChange(type);
    };
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: "oui-flex oui-w-full oui-gap-1",
        "data-testid": "oui-testid-orderEntry-orderType-lite",
        children: [
          marketOrderDisabled && marketOrderDisabledTooltip ? /* @__PURE__ */ jsx(
            Tooltip,
            {
              content: marketOrderDisabledTooltip,
              className: "oui-max-w-[275px]",
              children: /* @__PURE__ */ jsx("span", { className: "oui-inline-flex oui-flex-1", children: /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  className: unselectedButtonClassName,
                  "aria-pressed": false,
                  disabled: true,
                  "data-testid": "oui-testid-orderEntry-orderType-market",
                  children: /* @__PURE__ */ jsx(Text, { size: "xs", children: t("orderEntry.orderType.market") })
                }
              ) })
            }
          ) : /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: props.type === OrderType.MARKET ? selectedButtonClassName : unselectedButtonClassName,
              "aria-pressed": props.type === OrderType.MARKET,
              onClick: () => handleLiteChange(OrderType.MARKET),
              disabled: false,
              "data-testid": "oui-testid-orderEntry-orderType-market",
              children: /* @__PURE__ */ jsx(Text, { size: "xs", children: t("orderEntry.orderType.market") })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: props.type === OrderType.LIMIT ? selectedButtonClassName : unselectedButtonClassName,
              "aria-pressed": props.type === OrderType.LIMIT,
              onClick: () => handleLiteChange(OrderType.LIMIT),
              disabled: false,
              "data-testid": "oui-testid-orderEntry-orderType-limit",
              children: /* @__PURE__ */ jsx(Text, { size: "xs", children: t("orderEntry.orderType.limit") })
            }
          )
        ]
      }
    );
  }
  const handleMobileValueChange = (value) => {`;

  const mobileNeedle = `  const handleMobileValueChange = (value) => {`;
  if (!next.includes(mobileNeedle)) {
    console.error("mjs: mobile insert point not found");
    return code;
  }
  // Only replace the first occurrence inside OrderTypeSelect (first handleMobileValueChange)
  next = next.replace(mobileNeedle, liteBlock);
  return next;
}

function patchJs(code) {
  if (code.includes(MARKER)) return code;

  const hookNeedle = `  const mobileOptions = React3.useMemo(() => allOptions, [allOptions]);
  if (!isMobile) {`;
  const hookInsert = `  const mobileOptions = React3.useMemo(() => allOptions, [allOptions]);
  // ${MARKER}
  const [idxTradingMode, setIdxTradingMode] = React3.useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "lite" : "pro"
  );
  React3.useEffect(() => {
    const onChange = (event) => {
      const next = event?.detail?.mode;
      if (next === "lite" || next === "pro") setIdxTradingMode(next);
    };
    window.addEventListener("idx-dex-trading-mode-change", onChange);
    return () => window.removeEventListener("idx-dex-trading-mode-change", onChange);
  }, []);
  React3.useEffect(() => {
    if (idxTradingMode !== "lite") return;
    if (props.type !== types.OrderType.MARKET && props.type !== types.OrderType.LIMIT) {
      props.onChange(types.OrderType.MARKET);
    }
  }, [idxTradingMode]);
  if (!isMobile) {`;

  if (!code.includes(hookNeedle)) {
    console.error("js: hook insert point not found");
    return code;
  }
  let next = code.replace(hookNeedle, hookInsert);

  const liteBlock = `  // ${MARKER}: lite mobile = Market | Limit tabs
  if (idxTradingMode === "lite") {
    const baseButtonClassName = "oui-flex oui-flex-1 oui-items-center oui-justify-center oui-gap-x-1 oui-rounded oui-px-3 oui-py-0.5 oui-text-xs oui-font-semibold oui-h-8";
    const selectedButtonClassName = ui.cn(
      baseButtonClassName,
      "oui-bg-base-5 oui-text-base-contrast"
    );
    const unselectedButtonClassName = ui.cn(
      baseButtonClassName,
      "oui-bg-base-7 oui-text-base-contrast-36"
    );
    const handleLiteChange = (type) => {
      if (marketOrderDisabled && type === types.OrderType.MARKET && marketOrderDisabledTooltip) {
        ui.modal.alert({
          title: t("common.tips"),
          message: marketOrderDisabledTooltip
        });
        return;
      }
      props.onChange(type);
    };
    return /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        className: "oui-flex oui-w-full oui-gap-1",
        "data-testid": "oui-testid-orderEntry-orderType-lite",
        children: [
          marketOrderDisabled && marketOrderDisabledTooltip ? /* @__PURE__ */ jsxRuntime.jsx(
            ui.Tooltip,
            {
              content: marketOrderDisabledTooltip,
              className: "oui-max-w-[275px]",
              children: /* @__PURE__ */ jsxRuntime.jsx("span", { className: "oui-inline-flex oui-flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  className: unselectedButtonClassName,
                  "aria-pressed": false,
                  disabled: true,
                  "data-testid": "oui-testid-orderEntry-orderType-market",
                  children: /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "xs", children: t("orderEntry.orderType.market") })
                }
              ) })
            }
          ) : /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              className: props.type === types.OrderType.MARKET ? selectedButtonClassName : unselectedButtonClassName,
              "aria-pressed": props.type === types.OrderType.MARKET,
              onClick: () => handleLiteChange(types.OrderType.MARKET),
              disabled: false,
              "data-testid": "oui-testid-orderEntry-orderType-market",
              children: /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "xs", children: t("orderEntry.orderType.market") })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              type: "button",
              className: props.type === types.OrderType.LIMIT ? selectedButtonClassName : unselectedButtonClassName,
              "aria-pressed": props.type === types.OrderType.LIMIT,
              onClick: () => handleLiteChange(types.OrderType.LIMIT),
              disabled: false,
              "data-testid": "oui-testid-orderEntry-orderType-limit",
              children: /* @__PURE__ */ jsxRuntime.jsx(ui.Text, { size: "xs", children: t("orderEntry.orderType.limit") })
            }
          )
        ]
      }
    );
  }
  const handleMobileValueChange = (value) => {`;

  const mobileNeedle = `  const handleMobileValueChange = (value) => {`;
  if (!next.includes(mobileNeedle)) {
    console.error("js: mobile insert point not found");
    return code;
  }
  next = next.replace(mobileNeedle, liteBlock);
  return next;
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
console.log(`lite mobile order type tabs patch done (${changed} files updated)`);
