/**
 * Compact desktop (max2XL): keep Positions under the chart column (same width)
 * and restore the vertical stretch/split bar between chart and Positions.
 * Transforms pristine Orderly layout. Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "idx_max2xl_chart_positions_split";

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

function patch(code, { jsx, jsxs, cn, Flex, Box }) {
  if (code.includes(MARKER)) return code;

  // Pristine: outer SplitLayout owns max2XLSplitRef + full-width dataList sibling.
  // Replace that block’s children wiring with chart-column SplitLayout + dataList.
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
                      minHeight: minScreenHeightSM,
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

  // Left column: wrap chart flex + move dataList into SplitLayout under chart.
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
                                  /* ${MARKER} — Positions under chart + stretch bar */
                                  /* @__PURE__ */ ${jsxs}(
                                    SplitLayout,
                                    {
                                      ref: props.max2XLSplitRef,
                                      mode: "vertical",
                                      className: "oui-flex-1 oui-min-h-0 oui-w-full",
                                      onSizeChange: setDataListSplitHeightSM,
                                      onDragging: props.onDataListSplitHeightDragging,
                                      children: [
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
                                              "oui-flex-1 oui-min-h-0",
                                              layout === "left" && "oui-flex-row-reverse"
                                            ),`;

  if (!next.includes(leftColOpenMjs)) {
    console.warn("skip: left column chart flex pattern not found");
    return code;
  }
  next = next.replace(leftColOpenMjs, leftColOpenFixed);

  // Close chart flex and inject dataList as SplitLayout sibling; remove full-width dataList.
  // After chart SplitLayout ends, pristine has:
  //   ) ] } ), ] } ), orderEntry...
  // We need an extra close for the new SplitLayout children + dataList before left column closes.

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

  // Insert dataList into chart column before orderEntry Flex closes the left column.
  // Find the end of chart/orderbook flex inside left column:
  // after tradingviewAndOrderbook SplitLayout closes, pristine closes Flex then left Flex.
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
                                            className: "oui-trading-dataList-container oui-overflow-hidden",
                                            children: dataListWidget
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

  if (!next.includes(chartFlexClose)) {
    console.warn("skip: chart flex close pattern not found");
    return code;
  }

  next = next.replace(chartFlexClose, chartFlexCloseWithDataList);
  next = next.replace(dataListFullWidth, dataListRemoved);

  return next.includes(MARKER) ? next : code;
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
