/**
 * Compact desktop (max2XL): Positions under the chart column + vertical split bar.
 * Drag resizes the chart pane only; Positions is not driven by split state.
 * Chart flexes via the Positions split; orderbook keeps a reduced but usable floor.
 * Adds `idx-max2xl-chart-pos-split` for Lite/fold CSS to reclaim book height.
 * Shorter Positions default (does not grow chart) so the page scrolls less.
 * Disables order-entry extraHeight spacer (inflates column + empty space).
 * Transforms pristine Orderly layout. Idempotent (v8+).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER_V1 = "idx_max2xl_chart_positions_split";
const MARKER_V2 = "idx_max2xl_chart_positions_split_v2";
const MARKER_V3 = "idx_max2xl_chart_positions_split_v3";
const MARKER_V4 = "idx_max2xl_chart_positions_split_v4";
const MARKER_V5 = "idx_max2xl_chart_positions_split_v5";
const MARKER_V6 = "idx_max2xl_chart_positions_split_v6";
const MARKER_V7 = "idx_max2xl_chart_positions_split_v7";
const MARKER = "idx_max2xl_chart_positions_split_v8";
const EXTRA_HEIGHT_OFF_MARK = "idx_no_order_entry_extra_height";

/** Pro-mode orderbook + last trades floor (px); lower than Orderly's 464 for more chart stretch. */
const ORDERBOOK_FLOOR = 300;
/** Compact Positions floor (px); Orderly default is ~277–379. */
const POSITIONS_FLOOR = 200;

const SPLIT_CLASS_V6 = "oui-flex-1 oui-min-h-0 oui-w-full";
const SPLIT_CLASS_V7 = "oui-flex-1 oui-min-h-0 oui-w-full idx-max2xl-chart-pos-split";
const SHELL_MIN_V7 = "minHeight: minScreenHeightSM";
const SHELL_MIN_V8 = `minHeight: minScreenHeightSM - dataListMinHeight + ${POSITIONS_FLOOR}`;

const targets = [
  {
    rel: "node_modules/@orderly.network/trading/dist/index.mjs",
    jsx: "jsx",
    jsxs: "jsxs",
    cn: "cn",
    Flex: "Flex",
    Box: "Box",
  },
  {
    rel: "node_modules/@orderly.network/trading/dist/index.js",
    jsx: "jsxRuntime.jsx",
    jsxs: "jsxRuntime.jsxs",
    cn: "ui.cn",
    Flex: "ui.Flex",
    Box: "ui.Box",
  },
];

/** Persist first-pane (chart) %; SplitLayout's onSizeChange receives second-pane %. */
const onSizeChangeChart = `(size) => setDataListSplitHeightSM(\`\${100 - parseFloat(size)}\`)`;

/**
 * Mode-aware chart split persistence.
 * Lite default ~62% — comfortable, not crushed; separate key from older 55%.
 */
const CHART_SPLIT_PERSISTENT = `useSplitPersistent(
    typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "orderly_chart_split_height_sm_lite_v2" : "orderly_chart_split_height_sm",
    typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "62%" : "70%"
  )`;

/** Orderly pads #orderEntryView with extraHeight — zero it so the row doesn’t grow. */
function killExtraHeightSpacer(code, { jsx, Box }) {
  if (code.includes(EXTRA_HEIGHT_OFF_MARK)) return code;
  const from = `/* @__PURE__ */ ${jsx}(${Box}, { height: props.extraHeight })`;
  const to = `/* @__PURE__ */ ${jsx}(${Box}, { height: 0 /* ${EXTRA_HEIGHT_OFF_MARK} */ })`;
  if (!code.includes(from)) {
    console.warn("skip: extraHeight Box not found");
    return code;
  }
  return code.replace(from, to);
}

function patchPersistentDefault(code) {
  if (code.includes("orderly_chart_split_height_sm_lite_v2")) return code;

  // Upgrade prior mode-aware block (55% / lite v1 key)
  const fromLiteV1 = `useSplitPersistent(
    typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "orderly_chart_split_height_sm_lite" : "orderly_chart_split_height_sm",
    typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "55%" : "70%"
  )`;
  if (code.includes(fromLiteV1)) {
    return code.replace(fromLiteV1, CHART_SPLIT_PERSISTENT);
  }

  const fromLiteReady = `useSplitPersistent(
    "orderly_chart_split_height_sm",
    "70%"
  )`;
  if (code.includes(fromLiteReady)) {
    return code.replace(fromLiteReady, CHART_SPLIT_PERSISTENT);
  }

  const from = `useSplitPersistent(
    "orderly_datalist_split_height_sm",
    "350px"
  )`;
  if (code.includes(from)) return code.replace(from, CHART_SPLIT_PERSISTENT);

  const from3 = `useSplitPersistent("orderly_datalist_split_height_sm", "350px")`;
  const to3 = `useSplitPersistent(typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "orderly_chart_split_height_sm_lite_v2" : "orderly_chart_split_height_sm", typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "62%" : "70%")`;
  if (code.includes(from3)) return code.replace(from3, to3);

  const from3b = `useSplitPersistent("orderly_chart_split_height_sm", "70%")`;
  if (code.includes(from3b)) return code.replace(from3b, to3);

  const from3c = `useSplitPersistent(typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "orderly_chart_split_height_sm_lite" : "orderly_chart_split_height_sm", typeof document !== "undefined" && document.documentElement.dataset.idxTradingMode === "lite" ? "55%" : "70%")`;
  if (code.includes(from3c)) return code.replace(from3c, to3);
  return code;
}

function splitHeader(marker, { jsxs }, withDragging, splitClass = SPLIT_CLASS_V7) {
  const dragging = withDragging
    ? `\n                                      onDragging: props.onDataListSplitHeightDragging,`
    : "";
  return `/* ${marker} — Positions under chart; drag resizes chart */
                                  /* @__PURE__ */ ${jsxs}(
                                    SplitLayout,
                                    {
                                      ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      className: "${splitClass}",
                                      onSizeChange: ${onSizeChangeChart},${dragging}
                                      children: [`;
}

function upgradeV6ToV7(code) {
  if (
    !code.includes(MARKER_V6) ||
    code.includes(MARKER_V7) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code.replace(
    `/* ${MARKER_V6} — Positions under chart; drag resizes chart */`,
    `/* ${MARKER_V7} — Positions under chart; drag resizes chart */`
  );
  const fromClass = `className: "${SPLIT_CLASS_V6}",
                                      onSizeChange: ${onSizeChangeChart},`;
  const toClass = `className: "${SPLIT_CLASS_V7}",
                                      onSizeChange: ${onSizeChangeChart},`;
  // Only the chart↔positions split (immediately after our marker / max2XLSplitRef).
  const anchor = `ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      ${fromClass}`;
  const anchored = `ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      ${toClass}`;
  if (!next.includes(anchor)) {
    console.warn("skip v6→v7: split className not found");
    return code;
  }
  next = next.replace(anchor, anchored);
  return next.includes(MARKER_V7) ? next : code;
}

function upgradeV7ToV8(code) {
  if (!code.includes(MARKER_V7) || code.includes(MARKER)) return code;

  let next = code.replace(
    `/* ${MARKER_V7} — Positions under chart; drag resizes chart */`,
    `/* ${MARKER} — Positions under chart; drag resizes chart */`
  );

  // Shorter Positions floor in the chart-column dataList (first match after marker).
  const fromList = `style: {
                                              minHeight: dataListMinHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  const toList = `style: {
                                              minHeight: ${POSITIONS_FLOOR}
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  if (!next.includes(fromList)) {
    console.warn("skip v7→v8: dataList minHeight not found");
    return code;
  }
  next = next.replace(fromList, toList);

  // Shrink page minHeight by the data-list delta (chart unchanged).
  if (!next.includes(SHELL_MIN_V7)) {
    console.warn("skip v7→v8: shell minHeight not found");
    return code;
  }
  // Only the outer max2XL shell (first occurrence after our transform uses this).
  next = next.replace(SHELL_MIN_V7, SHELL_MIN_V8);
  return next.includes(MARKER) ? next : code;
}

function dataListBox({ jsx, Box }, useDataListHeight) {
  const minH = useDataListHeight
    ? `Math.max(dataListMinHeight, props.dataListHeight)`
    : `${POSITIONS_FLOOR}`;
  // v4+: no maxHeight so Positions can yield space to the chart
  const style = useDataListHeight
    ? `style: {
                                              minHeight: ${minH},
                                              maxHeight: dataListMaxHeight
                                            }`
    : `style: {
                                              minHeight: ${minH}
                                            }`;
  return `/* @__PURE__ */ ${jsx}(
                                          ${Box},
                                          {
                                            intensity: 900,
                                            r: "2xl",
                                            p: 2,
                                            ${style},
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden",
                                            children: dataListWidget
                                          }
                                        )`;
}

function chartFlexStyleClamped(cn) {
  return `style: {
                                              height: dataListSplitHeightSM,
                                              minHeight: tradindviewMinHeight + orderbookMinHeight + space,
                                              maxHeight: tradindviewMaxHeight + orderbookMaxHeight + space
                                            },
                                            className: ${cn}(
                                              "oui-min-h-0",
                                              layout === "left" && "oui-flex-row-reverse"
                                            )`;
}

/** v4: chart min was TV-only (too small for pro orderbook). */
function chartFlexStyleV4(cn) {
  return `style: {
                                              height: dataListSplitHeightSM,
                                              minHeight: tradindviewMinHeight
                                            },
                                            className: ${cn}(
                                              "oui-min-h-0 oui-overflow-hidden",
                                              layout === "left" && "oui-flex-row-reverse"
                                            )`;
}

/** v5: full Orderly orderbook min (~464). */
function chartFlexStyleV5(cn) {
  return `style: {
                                              height: dataListSplitHeightSM,
                                              minHeight: tradindviewMinHeight + orderbookMinHeight + space
                                            },
                                            className: ${cn}(
                                              "oui-min-h-0 oui-overflow-hidden",
                                              layout === "left" && "oui-flex-row-reverse"
                                            )`;
}

/** v6: reduced orderbook floor for more chart stretch. */
function chartFlexStyleFlexible(cn) {
  return `style: {
                                              height: dataListSplitHeightSM,
                                              minHeight: tradindviewMinHeight + ${ORDERBOOK_FLOOR} + space
                                            },
                                            className: ${cn}(
                                              "oui-min-h-0 oui-overflow-hidden",
                                              layout === "left" && "oui-flex-row-reverse"
                                            )`;
}

function orderbookStyleFloor(floor) {
  return `style: {
                                                    minHeight: ${floor},
                                                    height: orderBookSplitHeightSM
                                                  }`;
}

/** Nested TV flexes; orderbook uses reduced floor for pro mode flexibility. */
function loosenInnerChartClamps(code) {
  let next = code;
  const tvFrom = `style: {
                                                    minHeight: tradindviewMinHeight,
                                                    maxHeight: tradindviewMaxHeight,
                                                    height: 1200
                                                  }`;
  const tvTo = `style: {
                                                    minHeight: tradindviewMinHeight,
                                                    height: "100%"
                                                  }`;
  if (next.includes(tvFrom)) next = next.replace(tvFrom, tvTo);

  const obTarget = orderbookStyleFloor(ORDERBOOK_FLOOR);
  const obPristine = `style: {
                                                    minHeight: orderbookMinHeight,
                                                    maxHeight: orderbookMaxHeight,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  if (next.includes(obPristine)) next = next.replace(obPristine, obTarget);

  const obV4 = orderbookStyleFloor(160);
  if (next.includes(obV4)) next = next.replace(obV4, obTarget);

  const obV5 = `style: {
                                                    minHeight: orderbookMinHeight,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  if (next.includes(obV5)) next = next.replace(obV5, obTarget);
  return next;
}

function upgradeV5ToV6(code, { cn }) {
  if (
    !code.includes(MARKER_V5) ||
    code.includes(MARKER_V6) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code.replace(
    `/* ${MARKER_V5} — Positions under chart; drag resizes chart */`,
    `/* ${MARKER_V6} — Positions under chart; drag resizes chart */`
  );

  const v5 = chartFlexStyleV5(cn);
  const v6 = chartFlexStyleFlexible(cn);
  if (!next.includes(v5)) {
    console.warn("skip v5→v6: chart flex style not found");
    return code;
  }
  next = next.replace(v5, v6);
  next = loosenInnerChartClamps(next);
  next = patchPersistentDefault(next);
  return next.includes(MARKER_V6) ? next : code;
}

function upgradeV4ToV5(code, { cn }) {
  if (
    !code.includes(MARKER_V4) ||
    code.includes(MARKER_V5) ||
    code.includes(MARKER_V6) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code.replace(
    `/* ${MARKER_V4} — Positions under chart; drag resizes chart */`,
    `/* ${MARKER_V5} — Positions under chart; drag resizes chart */`
  );

  const v4 = chartFlexStyleV4(cn);
  const v5 = chartFlexStyleV5(cn);
  if (!next.includes(v4)) {
    console.warn("skip v4→v5: chart flex style not found");
    return code;
  }
  next = next.replace(v4, v5);
  // Apply v5 orderbook floor (Orderly min); v5→v6 lowers it.
  const obPristine = `style: {
                                                    minHeight: orderbookMinHeight,
                                                    maxHeight: orderbookMaxHeight,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  const obV5 = `style: {
                                                    minHeight: orderbookMinHeight,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  if (next.includes(obPristine)) next = next.replace(obPristine, obV5);
  const obV4 = orderbookStyleFloor(160);
  if (next.includes(obV4)) next = next.replace(obV4, obV5);
  next = patchPersistentDefault(next);
  return next.includes(MARKER_V5) ? next : code;
}

function upgradeV3ToV4(code, { cn }) {
  if (
    !code.includes(MARKER_V3) ||
    code.includes(MARKER_V4) ||
    code.includes(MARKER_V5) ||
    code.includes(MARKER_V6) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code.replace(
    `/* ${MARKER_V3} — Positions under chart; drag resizes chart */`,
    `/* ${MARKER_V4} — Positions under chart; drag resizes chart */`
  );

  const clamped = chartFlexStyleClamped(cn);
  const loose = chartFlexStyleV4(cn);
  if (!next.includes(clamped)) {
    console.warn("skip v3→v4: chart flex style not found");
    return code;
  }
  next = next.replace(clamped, loose);

  const v3List = `style: {
                                              minHeight: dataListMinHeight,
                                              maxHeight: dataListMaxHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  const v4List = `style: {
                                              minHeight: dataListMinHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  if (!next.includes(v3List)) {
    console.warn("skip v3→v4: dataList style not found");
    return code;
  }
  next = next.replace(v3List, v4List);
  // Leave inner clamps for v4→v5 (v4 briefly used 160px orderbook floor).
  const tvFrom = `style: {
                                                    minHeight: tradindviewMinHeight,
                                                    maxHeight: tradindviewMaxHeight,
                                                    height: 1200
                                                  }`;
  const tvTo = `style: {
                                                    minHeight: tradindviewMinHeight,
                                                    height: "100%"
                                                  }`;
  if (next.includes(tvFrom)) next = next.replace(tvFrom, tvTo);
  const obFrom = `style: {
                                                    minHeight: orderbookMinHeight,
                                                    maxHeight: orderbookMaxHeight,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  const obV4 = `style: {
                                                    minHeight: 160,
                                                    height: orderBookSplitHeightSM
                                                  }`;
  if (next.includes(obFrom)) next = next.replace(obFrom, obV4);
  next = patchPersistentDefault(next);
  return next.includes(MARKER_V4) ? next : code;
}

function upgradeV2ToV3(code, ids) {
  if (
    !code.includes(MARKER_V2) ||
    code.includes(MARKER_V3) ||
    code.includes(MARKER_V4) ||
    code.includes(MARKER_V5) ||
    code.includes(MARKER_V6) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code;
  const fromHeader = splitHeader(MARKER_V2, ids, true, SPLIT_CLASS_V6);
  const toHeader = splitHeader(MARKER_V3, ids, false, SPLIT_CLASS_V6);
  if (!next.includes(fromHeader)) {
    console.warn("skip v2→v3: split header not found");
    return code;
  }
  next = next.replace(fromHeader, toHeader);

  const fromList = `style: {
                                              minHeight: Math.max(dataListMinHeight, props.dataListHeight),
                                              maxHeight: dataListMaxHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  const toList = `style: {
                                              minHeight: dataListMinHeight,
                                              maxHeight: dataListMaxHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden"`;
  if (!next.includes(fromList)) {
    console.warn("skip v2→v3: dataList box not found");
    return code;
  }
  next = next.replace(fromList, toList);
  next = patchPersistentDefault(next);
  return next.includes(MARKER_V3) ? next : code;
}

function upgradeV1ToV3(code, { jsx, jsxs, cn, Flex, Box }) {
  if (
    !code.includes(MARKER_V1) ||
    code.includes(MARKER_V2) ||
    code.includes(MARKER_V3) ||
    code.includes(MARKER_V4) ||
    code.includes(MARKER_V5) ||
    code.includes(MARKER_V6) ||
    code.includes(MARKER)
  ) {
    return code;
  }

  let next = code;
  const v1Split = `/* ${MARKER_V1} — Positions under chart + stretch bar */
                                  /* @__PURE__ */ ${jsxs}(
                                    SplitLayout,
                                    {
                                      ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      className: "oui-flex-1 oui-min-h-0 oui-w-full",
                                      onSizeChange: setDataListSplitHeightSM,
                                      onDragging: props.onDataListSplitHeightDragging,`;

  const v3Split = `/* ${MARKER_V3} — Positions under chart; drag resizes chart */
                                  /* @__PURE__ */ ${jsxs}(
                                    SplitLayout,
                                    {
                                      ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      className: "oui-flex-1 oui-min-h-0 oui-w-full",
                                      onSizeChange: ${onSizeChangeChart},`;

  if (!next.includes(v1Split)) {
    console.warn("skip v1→v3: split header not found");
    return code;
  }
  next = next.replace(v1Split, v3Split);

  const chartStyleV1 = `/* @__PURE__ */ ${jsxs}(
                                          ${Flex},
                                          {
                                            width: "100%",
                                            height: "100%",
                                            gapX: 2,
                                            itemAlign: "stretch",
                                            style: {
                                              minHeight: tradindviewMinHeight + orderbookMinHeight + space,
                                              maxHeight: tradindviewMaxHeight + orderbookMaxHeight + space
                                            },
                                            className: ${cn}(
                                              "oui-flex-1 oui-min-h-0",
                                              layout === "left" && "oui-flex-row-reverse"
                                            ),`;

  const chartStyleV3 = `/* @__PURE__ */ ${jsxs}(
                                          ${Flex},
                                          {
                                            width: "100%",
                                            gapX: 2,
                                            itemAlign: "stretch",
                                            ${chartFlexStyleClamped(cn)},`;

  if (!next.includes(chartStyleV1)) {
    console.warn("skip v1→v3: chart flex style not found");
    return code;
  }
  next = next.replace(chartStyleV1, chartStyleV3);

  const dataListV1 = `/* @__PURE__ */ ${jsx}(
                                          ${Box},
                                          {
                                            intensity: 900,
                                            r: "2xl",
                                            p: 2,
                                            style: {
                                              height: dataListSplitHeightSM,
                                              minHeight: Math.max(dataListMinHeight, props.dataListHeight),
                                              maxHeight: dataListMaxHeight
                                            },
                                            className: "oui-trading-dataList-container oui-overflow-hidden",
                                            children: dataListWidget
                                          }
                                        )`;

  // Intermediate v3 dataList (still has maxHeight); v3→v4 strips it.
  const dataListV3 = `/* @__PURE__ */ ${jsx}(
                                          ${Box},
                                          {
                                            intensity: 900,
                                            r: "2xl",
                                            p: 2,
                                            style: {
                                              minHeight: dataListMinHeight,
                                              maxHeight: dataListMaxHeight
                                            },
                                            className: "oui-trading-dataList-container oui-flex-1 oui-min-h-0 oui-overflow-hidden",
                                            children: dataListWidget
                                          }
                                        )`;
  if (!next.includes(dataListV1)) {
    console.warn("skip v1→v3: dataList box not found");
    return code;
  }
  next = next.replace(dataListV1, dataListV3);
  next = patchPersistentDefault(next);
  return next.includes(MARKER_V3) ? next : code;
}

function patchPristine(code, { jsx, jsxs, cn, Flex, Box }) {
  const fromOuterSplit = `/* @__PURE__ */ ${jsxs}(
                  SplitLayout,
                  {
                    ref: props.max2XLSplitRef,
                    style: {
                      minHeight: minScreenHeightSM,
                      minWidth: 1024 - scrollBarWidth
                      // height: props.extraHeight ? props.extraHeight : undefined,
                    },
                    className: ${cn}(
                      "oui-flex oui-flex-1",
                      "oui-size-full oui-min-w-[1018px]",
                      "oui-px-3 oui-py-2",
                      props.className
                    ),
                    onSizeChange: setDataListSplitHeightSM,
                    onDragging: props.onDataListSplitHeightDragging,
                    mode: "vertical",
                    children: [
                      /* @__PURE__ */ ${jsxs}(
                        ${Flex},
                        {
                          gapX: 2,
                          itemAlign: "stretch",
                          className: ${cn}(
                            "oui-flex-1",
                            layout === "left" && "oui-flex-row-reverse"
                          ),
                          style: {
                            minHeight: Math.max(
                              symbolInfoBarHeight2 + tradindviewMinHeight + orderbookMinHeight + space * 2,
                              props.orderEntryHeight
                            ),
                            maxHeight: symbolInfoBarHeight2 + tradindviewMaxHeight + orderbookMaxHeight + space * 2
                          },`;

  const toOuterFlex = `/* @__PURE__ */ ${jsxs}(
                  ${Flex},
                  {
                    style: {
                      ${SHELL_MIN_V8},
                      minWidth: 1024 - scrollBarWidth
                    },
                    className: ${cn}(
                      "oui-flex oui-flex-1 oui-flex-col",
                      "oui-size-full oui-min-w-[1018px]",
                      "oui-px-3 oui-py-2",
                      props.className
                    ),
                    children: [
                      /* @__PURE__ */ ${jsxs}(
                        ${Flex},
                        {
                          gapX: 2,
                          itemAlign: "stretch",
                          className: ${cn}(
                            "oui-flex-1 oui-min-h-0",
                            layout === "left" && "oui-flex-row-reverse"
                          ),
                          style: {
                            minHeight: Math.max(
                              symbolInfoBarHeight2 + tradindviewMinHeight + orderbookMinHeight + space * 2,
                              props.orderEntryHeight
                            ),
                          },`;

  if (!code.includes(fromOuterSplit)) {
    console.warn("skip: pristine max2XL outer SplitLayout pattern not found");
    return code;
  }

  let next = code.replace(fromOuterSplit, toOuterFlex);

  const leftColOpenMjs = `/* @__PURE__ */ ${jsxs}(
                              ${Flex},
                              {
                                height: "100%",
                                className: "oui-w-[calc(100%_-_280px_-_12px)] oui-flex-1",
                                direction: "column",
                                gapY: 2,
                                children: [
                                  symbolInfoBarView,
                                  /* @__PURE__ */ ${jsxs}(
                                    ${Flex},
                                    {
                                      width: "100%",
                                      height: "100%",
                                      gapX: 2,
                                      itemAlign: "stretch",
                                      style: {
                                        minHeight: tradindviewMinHeight + orderbookMinHeight + space,
                                        maxHeight: tradindviewMaxHeight + orderbookMaxHeight + space
                                      },
                                      className: ${cn}(
                                        "oui-flex-1",
                                        layout === "left" && "oui-flex-row-reverse"
                                      ),`;

  const leftColOpenFixed = `/* @__PURE__ */ ${jsxs}(
                              ${Flex},
                              {
                                className: "oui-w-[calc(100%_-_280px_-_12px)] oui-flex-1 oui-min-h-0",
                                direction: "column",
                                gapY: 2,
                                children: [
                                  symbolInfoBarView,
                                  /* ${MARKER} — Positions under chart; drag resizes chart */
                                  /* @__PURE__ */ ${jsxs}(
                                    SplitLayout,
                                    {
                                      ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      className: "${SPLIT_CLASS_V7}",
                                      onSizeChange: ${onSizeChangeChart},
                                      children: [
                                        /* @__PURE__ */ ${jsxs}(
                                          ${Flex},
                                          {
                                            width: "100%",
                                            gapX: 2,
                                            itemAlign: "stretch",
                                            ${chartFlexStyleFlexible(cn)},`;

  if (!next.includes(leftColOpenMjs)) {
    console.warn("skip: left column chart flex pattern not found");
    return code;
  }
  next = next.replace(leftColOpenMjs, leftColOpenFixed);

  const dataListFullWidth = `),
                      /* @__PURE__ */ ${jsx}(
                        ${Box},
                        {
                          intensity: 900,
                          r: "2xl",
                          p: 2,
                          style: {
                            height: dataListSplitHeightSM,
                            minHeight: Math.max(dataListMinHeight, props.dataListHeight),
                            maxHeight: dataListMaxHeight
                          },
                          className: "oui-overflow-hidden",
                          children: dataListWidget
                        }
                      ),
                      marketLayout === "bottom" && stickyHorizontalMarketsView`;

  const dataListRemoved = `),
                      marketLayout === "bottom" && stickyHorizontalMarketsView`;

  if (!next.includes(dataListFullWidth)) {
    console.warn("skip: full-width dataList pattern not found");
    return code;
  }

  const chartFlexClose = `                                            ]
                                          }
                                        )
                                      ]
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ ${jsxs}(
                              ${Flex},
                              {
                                ref: props.orderEntryViewRef,`;

  const chartFlexCloseWithDataList = `                                            ]
                                          }
                                        )
                                      ]
                                    }
                                  ),
                                        ${dataListBox({ jsx, Box }, false)}
                                      ]
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ ${jsxs}(
                              ${Flex},
                              {
                                ref: props.orderEntryViewRef,`;

  if (!next.includes(chartFlexClose)) {
    console.warn("skip: chart flex close pattern not found");
    return code;
  }

  next = next.replace(chartFlexClose, chartFlexCloseWithDataList);
  next = next.replace(dataListFullWidth, dataListRemoved);
  next = loosenInnerChartClamps(next);
  next = patchPersistentDefault(next);

  return next.includes(MARKER) ? next : code;
}

function patch(code, ids) {
  let next = code;
  if (next.includes(MARKER)) {
    next = patchPersistentDefault(next);
  } else if (next.includes(MARKER_V7)) {
    next = upgradeV7ToV8(next);
  } else if (next.includes(MARKER_V6)) {
    next = upgradeV7ToV8(upgradeV6ToV7(next));
  } else if (next.includes(MARKER_V5)) {
    next = upgradeV7ToV8(upgradeV6ToV7(upgradeV5ToV6(next, ids)));
  } else if (next.includes(MARKER_V4)) {
    next = upgradeV7ToV8(
      upgradeV6ToV7(upgradeV5ToV6(upgradeV4ToV5(next, ids), ids))
    );
  } else if (next.includes(MARKER_V3)) {
    next = upgradeV7ToV8(
      upgradeV6ToV7(
        upgradeV5ToV6(upgradeV4ToV5(upgradeV3ToV4(next, ids), ids), ids)
      )
    );
  } else if (next.includes(MARKER_V2)) {
    next = upgradeV7ToV8(
      upgradeV6ToV7(
        upgradeV5ToV6(
          upgradeV4ToV5(upgradeV3ToV4(upgradeV2ToV3(next, ids), ids), ids),
          ids
        )
      )
    );
  } else if (next.includes(MARKER_V1)) {
    next = upgradeV7ToV8(
      upgradeV6ToV7(
        upgradeV5ToV6(
          upgradeV4ToV5(upgradeV3ToV4(upgradeV1ToV3(next, ids), ids), ids),
          ids
        )
      )
    );
  } else {
    next = patchPristine(next, ids);
  }
  next = killExtraHeightSpacer(next, ids);
  return next;
}

let changed = 0;
for (const target of targets) {
  const file = path.join(root, target.rel);
  if (!fs.existsSync(file)) {
    console.warn("skip missing", target.rel);
    continue;
  }
  const before = fs.readFileSync(file, "utf8");
  const after = patch(before, target);
  if (after === before) {
    console.log("unchanged", target.rel);
    continue;
  }
  if (!after.includes(MARKER)) {
    console.error("FAILED: marker missing after patch", target.rel);
    continue;
  }
  fs.writeFileSync(file, after);
  changed += 1;
  console.log("patched", target.rel);
}

console.log(`max2xl chart/positions split patch done (${changed} files updated)`);
