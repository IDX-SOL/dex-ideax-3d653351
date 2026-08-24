import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AiFuturesBotMarket } from "./constants";
import type { Candle } from "./market";
import {
  computeTpSl,
  DEFAULT_STRETCH_GEOMETRY,
  plannedStretchLevels,
  type StretchGeometry,
} from "./stretchLevels";

export type IntentLineState = "thinking" | "armed" | "long" | "short" | "idle";
type TickDir = "up" | "down" | "flat";

type IntentChartProps = {
  market: AiFuturesBotMarket;
  mean: number;
  price: number;
  stretch: number;
  side: "long" | "short" | null;
  phaseId: string;
  timeframe: "5m" | "15m" | "1h";
  onTimeframeChange: (tf: "5m" | "15m" | "1h") => void;
  running: boolean;
  candles?: Candle[];
  /** Worker online but M not ready yet — no demo fallback */
  marketLoading?: boolean;
  /** Engine chart is 15m only */
  lockTimeframe?: boolean;
  /** 30d median daily TR (D) — enables real × D planning (no fake %) */
  dailyTrMed?: number | null;
  /** Exchange-synced levels when in position */
  fillEntry?: number | null;
  fillTp?: number | null;
  fillSl?: number | null;
  /** Engine planned 2nd-leg price while add still available */
  plannedAdd?: number | null;
  /** True when boss is about to ADD (highlight Add line) */
  addArmed?: boolean;
  /** From worker GET /v1/strategy/config when online */
  geometry?: StretchGeometry;
};

const LABEL_GAP = 16;
const FONT = "Space Grotesk, sans-serif";
const TAG_H = 15;
const TAG_PAD_X = 5;
const TAG_NOTCH = 4;
const TEAL = "#3ecfba";
const ROSE = "#f07178";
const SL_GREY = "rgba(200,214,222,0.72)";

function planningActive(phaseId: string, stretch: number): boolean {
  return phaseId === "plan" || stretch >= 0.55;
}

function lineColor(id: string, state: IntentLineState): string {
  if (state === "idle") return "rgba(200,214,222,0.25)";
  if (state === "thinking" || state === "armed") {
    if (id === "sl") return SL_GREY;
    return "rgba(255,255,255,0.88)";
  }
  // Active filled levels
  if (id === "tp") return TEAL;
  if (id === "sl") return SL_GREY;
  if (state === "long") return TEAL;
  if (state === "short") return ROSE;
  return "rgba(200,214,222,0.25)";
}

function estimateTextWidth(text: string, fontSize = 10): number {
  return Math.ceil(text.length * fontSize * 0.62) + 2;
}

type TagStyle = {
  fill: string;
  stroke: string;
  text: string;
};

function meanTagStyle(): TagStyle {
  return {
    fill: "rgba(18,24,30,0.92)",
    stroke: "rgba(200,214,222,0.35)",
    text: "rgba(200,214,222,0.82)",
  };
}

function priceTagStyle(dir: TickDir): TagStyle {
  if (dir === "up") {
    return { fill: TEAL, stroke: TEAL, text: "#04120f" };
  }
  if (dir === "down") {
    return { fill: ROSE, stroke: ROSE, text: "#1a0608" };
  }
  return {
    fill: "rgba(232,238,242,0.92)",
    stroke: "rgba(232,238,242,0.92)",
    text: "#0a0e12",
  };
}

function levelTagStyle(id: string, state: IntentLineState): TagStyle {
  if (state === "idle") return meanTagStyle();
  if (id === "tp" && (state === "long" || state === "short")) {
    return { fill: TEAL, stroke: TEAL, text: "#04120f" };
  }
  if (id === "sl" && state !== "thinking") {
    return {
      fill: "rgba(200,214,222,0.22)",
      stroke: "rgba(200,214,222,0.55)",
      text: "rgba(232,238,242,0.92)",
    };
  }
  switch (state) {
    case "long":
      return { fill: TEAL, stroke: TEAL, text: "#04120f" };
    case "short":
      return { fill: ROSE, stroke: ROSE, text: "#1a0608" };
    case "armed":
      return {
        fill: "rgba(255,255,255,0.16)",
        stroke: "rgba(255,255,255,0.55)",
        text: "rgba(255,255,255,0.95)",
      };
    case "thinking":
      return {
        fill: "rgba(255,255,255,0.08)",
        stroke: "rgba(255,255,255,0.32)",
        text: "rgba(255,255,255,0.88)",
      };
    default:
      return meanTagStyle();
  }
}

/** Exchange-style price flag: rounded body + notch toward the plot. */
function PriceTag({
  anchorX,
  y,
  lineY,
  text,
  style,
  side,
}: {
  anchorX: number;
  y: number;
  lineY: number;
  text: string;
  style: TagStyle;
  side: "left" | "right";
}) {
  const tw = estimateTextWidth(text);
  const w = tw + TAG_PAD_X * 2;
  const h = TAG_H;
  const n = TAG_NOTCH;
  const cy = y;
  const top = cy - h / 2;
  const nudged = Math.abs(y - lineY) > 1.5;

  const bodyX = side === "left" ? anchorX - n - w : anchorX + n;
  const textX = bodyX + w / 2;
  const notchPath =
    side === "left"
      ? `M ${anchorX} ${lineY} L ${anchorX - n} ${cy - 3.5} L ${anchorX - n} ${cy + 3.5} Z`
      : `M ${anchorX} ${lineY} L ${anchorX + n} ${cy - 3.5} L ${anchorX + n} ${cy + 3.5} Z`;

  return (
    <g>
      {nudged ? (
        <path
          d={
            side === "left"
              ? `M ${anchorX - n} ${cy} L ${anchorX + 4} ${lineY}`
              : `M ${anchorX + n} ${cy} L ${anchorX - 4} ${lineY}`
          }
          fill="none"
          stroke={style.stroke}
          strokeWidth="0.75"
          opacity={0.4}
        />
      ) : null}
      <path d={notchPath} fill={style.fill} stroke="none" />
      <rect
        x={bodyX}
        y={top}
        width={w}
        height={h}
        rx={2.5}
        ry={2.5}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.fill === style.stroke ? 0 : 1}
      />
      <text
        x={textX}
        y={cy + 3.2}
        textAnchor="middle"
        fill={style.text}
        fontSize="10"
        fontFamily={FONT}
        fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

/** Nudge label Ys so nearby labels don’t stack; keep within plot bounds. */
function resolveLabelYs(
  items: { id: string; y: number }[],
  minY: number,
  maxY: number,
  gap = LABEL_GAP,
): Record<string, number> {
  if (items.length === 0) return {};
  const sorted = items
    .map((item) => ({ ...item }))
    .sort((a, b) => a.y - b.y);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < gap) {
      sorted[i].y = sorted[i - 1].y + gap;
    }
  }

  if (sorted[sorted.length - 1].y > maxY) {
    const overflow = sorted[sorted.length - 1].y - maxY;
    for (const item of sorted) item.y -= overflow;
  }

  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i + 1].y - sorted[i].y < gap) {
      sorted[i].y = sorted[i + 1].y - gap;
    }
  }

  if (sorted[0].y < minY) {
    const deficit = minY - sorted[0].y;
    for (const item of sorted) item.y += deficit;
  }

  return Object.fromEntries(sorted.map((item) => [item.id, item.y]));
}

function buildDemoPath(
  width: number,
  height: number,
  meanY: number,
  priceY: number,
  stretch: number,
  side: "long" | "short" | null,
  seed: number,
): string {
  const points: string[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = t * width;
    const wave =
      Math.sin(t * Math.PI * 3.2 + seed) * (10 + stretch * 18) +
      Math.sin(t * Math.PI * 7.1 + seed * 0.7) * 4;
    const drift = (priceY - meanY) * Math.pow(t, 1.35);
    const bias =
      side === "long"
        ? stretch * 22 * Math.sin(t * Math.PI)
        : side === "short"
          ? -stretch * 22 * Math.sin(t * Math.PI)
          : 0;
    const y = meanY + drift + wave + bias;
    points.push(
      `${x.toFixed(1)},${Math.min(height - 8, Math.max(8, y)).toFixed(1)}`,
    );
  }
  return `M ${points.join(" L ")}`;
}

function buildCandlePath(
  width: number,
  padY: number,
  plotH: number,
  candles: Candle[],
  minP: number,
  maxP: number,
): string {
  if (candles.length < 2) return "";
  const span = maxP - minP || 1;
  const yFor = (p: number) => padY + ((maxP - p) / span) * plotH;
  const last = candles.length - 1;
  const points = candles.map((c, i) => {
    const x = (i / last) * width;
    const y = Math.min(padY + plotH - 2, Math.max(padY + 2, yFor(c.c)));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

function IntentLine({
  id,
  y,
  state,
  x1,
  x2,
}: {
  id: string;
  y: number;
  state: IntentLineState;
  x1: number;
  x2: number;
}) {
  const dashed = state === "thinking" || state === "armed";
  return (
    <line
      x1={x1}
      x2={x2}
      y1={y}
      y2={y}
      stroke={lineColor(id, state)}
      strokeWidth={dashed ? 1.25 : 1.75}
      strokeDasharray={dashed ? "3 5" : undefined}
      opacity={state === "thinking" ? 0.75 : 1}
      className={dashed ? "afb-intent-pulse" : undefined}
    />
  );
}

export default function IntentChart({
  market,
  mean,
  price,
  stretch,
  side,
  phaseId,
  timeframe,
  onTimeframeChange,
  running,
  candles = [],
  marketLoading = false,
  lockTimeframe = false,
  dailyTrMed = null,
  fillEntry = null,
  fillTp = null,
  fillSl = null,
  plannedAdd = null,
  addArmed = false,
  geometry = DEFAULT_STRETCH_GEOMETRY,
}: IntentChartProps) {
  const clipId = useId().replace(/:/g, "");
  const prevPriceRef = useRef<number | null>(null);
  const [tickDir, setTickDir] = useState<TickDir>("flat");

  useEffect(() => {
    if (!(price > 0)) return;
    const prev = prevPriceRef.current;
    if (prev != null) {
      if (price > prev) setTickDir("up");
      else if (price < prev) setTickDir("down");
    }
    prevPriceRef.current = price;
  }, [price]);

  const leftW = 88;
  const rightW = 96;
  const H = 220;
  const padY = 18;
  const plotW = 640 - leftW - rightW;
  const plotH = H - padY * 2;
  const plotLeft = leftW;
  const plotRight = leftW + plotW;
  const W = leftW + plotW + rightW;

  const levels = useMemo(() => {
    const hasFill = fillEntry != null && fillEntry > 0;
    const d = dailyTrMed != null && dailyTrMed > 0 ? dailyTrMed : 0;
    const useEngine = mean > 0 && d > 0;
    // Prefer position side when filled; else market fade bias
    const fadeSide: "long" | "short" | null =
      hasFill && (side === "long" || side === "short")
        ? side
        : side === "long" || side === "short"
          ? side
          : null;
    const longBias = fadeSide !== "short";

    let entry = 0;
    let add = 0;
    let tp = 0;
    let sl = 0;
    let entryState: IntentLineState = "idle";
    let addState: IntentLineState = "idle";
    let tpState: IntentLineState = "idle";
    let slState: IntentLineState = "idle";

    if (useEngine && fadeSide) {
      const planned = plannedStretchLevels(fadeSide, mean, d, geometry);
      entry = planned.entry;
      add = planned.add;
      tp = planned.tp;
      sl = planned.sl;

      if (hasFill) {
        entry = fillEntry;
        const live = computeTpSl({
          side: fadeSide,
          mean,
          dailyTrMed: d,
          avgEntry: fillEntry,
          geo: geometry,
        });
        tp = fillTp != null && fillTp > 0 ? fillTp : live.tp;
        sl = fillSl != null && fillSl > 0 ? fillSl : live.sl;
        const hasPlannedAdd = plannedAdd != null && plannedAdd > 0;
        add = hasPlannedAdd ? plannedAdd : 0;

        entryState = fadeSide;
        tpState = "long";
        slState = "long";
        if (hasPlannedAdd) {
          addState = addArmed || phaseId === "capture" ? "armed" : "thinking";
        }
      } else {
        // Flat: live planning follows M / D
        if (phaseId === "plan" || planningActive(phaseId, stretch)) {
          entryState = phaseId === "plan" ? "armed" : "thinking";
          tpState = "thinking";
          slState = "armed";
          addState = "idle"; // add only after first leg
        } else if (stretch > 0.2) {
          entryState = "thinking";
          tpState = "thinking";
          slState = "thinking";
        }
      }
    } else {
      // Demo / no D yet — light placeholders only (not sold as live engine)
      const entryOffset = mean * (0.012 + stretch * 0.02);
      const tpOffset = mean * 0.008;
      const slOffset = mean * (0.028 + stretch * 0.02);
      entry = longBias ? mean - entryOffset : mean + entryOffset;
      tp = longBias ? mean - tpOffset : mean + tpOffset;
      sl = longBias ? mean - slOffset : mean + slOffset;
      if (hasFill) {
        entry = fillEntry;
        if (fillTp != null && fillTp > 0) tp = fillTp;
        if (fillSl != null && fillSl > 0) sl = fillSl;
        entryState = longBias ? "long" : "short";
        tpState = "long";
        slState = "long";
      } else if (phaseId === "plan") {
        entryState = "armed";
        tpState = "thinking";
        slState = "armed";
      } else if (stretch > 0.25) {
        entryState = "thinking";
      }
      if (plannedAdd != null && plannedAdd > 0 && hasFill) {
        add = plannedAdd;
        addState = addArmed ? "armed" : "thinking";
      }
    }

    return {
      entry,
      add,
      tp,
      sl,
      entryState,
      addState,
      tpState,
      slState,
      longBias,
    };
  }, [
    mean,
    stretch,
    side,
    phaseId,
    dailyTrMed,
    fillEntry,
    fillTp,
    fillSl,
    plannedAdd,
    addArmed,
    geometry,
  ]);

  const candleHi = candles.length
    ? Math.max(...candles.map((c) => c.h))
    : price;
  const candleLo = candles.length
    ? Math.min(...candles.map((c) => c.l))
    : price;
  const levelPrices = [mean, price];
  if (levels.entryState !== "idle" && levels.entry > 0) {
    levelPrices.push(levels.entry);
  }
  if (levels.addState !== "idle" && levels.add > 0) {
    levelPrices.push(levels.add);
  }
  if (levels.tpState !== "idle" && levels.tp > 0) {
    levelPrices.push(levels.tp);
  }
  if (levels.slState !== "idle" && levels.sl > 0) {
    levelPrices.push(levels.sl);
  }
  const hi = Math.max(candleHi, ...levelPrices);
  const lo = Math.min(candleLo, ...levelPrices);
  const pad = Math.max((hi - lo) * 0.12, mean * 0.004, 0.01);
  const minP = lo - pad;
  const maxP = hi + pad;
  const yFor = (p: number) => padY + ((maxP - p) / (maxP - minP)) * plotH;

  const meanY = yFor(mean);
  const priceY = yFor(price);
  const entryY = yFor(levels.entry);
  const addY = yFor(levels.add);
  const tpY = yFor(levels.tp);
  const slY = yFor(levels.sl);

  const showDemo = !marketLoading && mean > 0 && price > 0;

  const path = useMemo(() => {
    if (candles.length >= 2) {
      return buildCandlePath(plotW, padY, plotH, candles, minP, maxP);
    }
    if (!showDemo) {
      return "";
    }
    return buildDemoPath(
      plotW,
      H,
      meanY,
      priceY,
      stretch,
      side,
      market.symbol.length + timeframe.length,
    );
  }, [
    candles,
    plotW,
    plotH,
    minP,
    maxP,
    meanY,
    priceY,
    stretch,
    side,
    market.symbol,
    timeframe,
    showDemo,
    H,
  ]);

  const format = (n: number) => {
    if (market.symbol === "BTC") {
      return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    if (market.symbol === "ETH") {
      return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
    }
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  const rightLines = [
    {
      id: "entry",
      label: "Entry",
      state: levels.entryState,
      y: entryY,
      price: levels.entry,
    },
    {
      id: "add",
      label: "Add",
      state: levels.addState,
      y: addY,
      price: levels.add,
    },
    {
      id: "tp",
      label: "TP",
      state: levels.tpState,
      y: tpY,
      price: levels.tp,
    },
    {
      id: "sl",
      label: "SL",
      state: levels.slState,
      y: slY,
      price: levels.sl,
    },
  ].filter((l) => l.state !== "idle");

  const labelMin = padY + 8;
  const labelMax = padY + plotH - 4;

  const leftResolved = resolveLabelYs(
    [
      { id: "mean", y: meanY },
      { id: "price", y: priceY },
    ],
    labelMin,
    labelMax,
  );

  const rightResolved = resolveLabelYs(
    rightLines.map((l) => ({ id: l.id, y: l.y })),
    labelMin,
    labelMax,
  );

  const leftLabelsView = [
    ...(mean > 0
      ? [
          {
            id: "mean",
            y: leftResolved.mean ?? meanY,
            lineY: meanY,
            display: `M ${format(mean)}`,
            style: meanTagStyle(),
          },
        ]
      : marketLoading
        ? [
            {
              id: "mean",
              y: leftResolved.mean ?? priceY,
              lineY: priceY,
              display: "M …",
              style: meanTagStyle(),
            },
          ]
        : []),
    ...(price > 0
      ? [
          {
            id: "price",
            y: leftResolved.price ?? priceY,
            lineY: priceY,
            display: `Live ${format(price)}`,
            style: priceTagStyle(tickDir),
          },
        ]
      : []),
  ];

  const rightLabelsView = rightLines.map((l) => ({
    id: l.id,
    y: rightResolved[l.id] ?? l.y,
    lineY: l.y,
    display: `${l.label} ${format(l.price)}`,
    style: levelTagStyle(l.id, l.state),
  }));

  return (
    <div className="afb-intent-chart">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="afb-display text-sm font-semibold text-[var(--afb-text)]">
            Intent chart · {market.label}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--afb-muted)]">
            {lockTimeframe
              ? "Engine · 15m — same on every tab"
              : "Left: M & Live · Right: live fill or planned Entry/TP/SL/Add (× D)"}
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--afb-line)] bg-black/30 p-0.5">
          {(["5m", "15m", "1h"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              disabled={lockTimeframe && tf !== "15m"}
              onClick={() => onTimeframeChange(tf)}
              className={`afb-display rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors ${
                timeframe === tf
                  ? "bg-white/12 text-[var(--afb-text)]"
                  : lockTimeframe && tf !== "15m"
                    ? "cursor-not-allowed text-[var(--afb-muted)]/40"
                    : "text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[var(--afb-line)] bg-[rgba(4,7,10,0.65)]">
        {marketLoading ? (
          <p className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-[11px] text-[var(--afb-muted)]">
            Loading session mean…
          </p>
        ) : null}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[200px] w-full sm:h-[240px]"
          role="img"
          aria-label={`${market.label} intent chart`}
        >
          <defs>
            <clipPath id={`afbPlotClip-${clipId}`}>
              <rect x={plotLeft} y={padY} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid */}
          {Array.from({ length: 6 }).map((_, i) => {
            const y = padY + (plotH / 5) * i;
            return (
              <line
                key={`h-${i}`}
                x1={plotLeft}
                x2={plotRight}
                y1={y}
                y2={y}
                stroke="rgba(140,190,200,0.08)"
                strokeWidth="1"
              />
            );
          })}
          {Array.from({ length: 9 }).map((_, i) => {
            const x = plotLeft + (plotW / 8) * i;
            return (
              <line
                key={`v-${i}`}
                x1={x}
                x2={x}
                y1={padY}
                y2={padY + plotH}
                stroke="rgba(140,190,200,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {mean > 0 ? (
            <>
              <rect
                x={plotLeft}
                y={Math.min(yFor(mean * 1.015), yFor(mean * 0.985))}
                width={plotW}
                height={Math.abs(yFor(mean * 0.985) - yFor(mean * 1.015))}
                fill="rgba(62,207,186,0.05)"
              />
              <line
                x1={plotLeft}
                x2={plotRight}
                y1={meanY}
                y2={meanY}
                stroke="rgba(200,214,222,0.45)"
                strokeWidth="1.25"
                strokeDasharray="5 5"
              />
            </>
          ) : null}

          {/* Intent lines */}
          {rightLines.map((l) => (
            <IntentLine
              key={l.id}
              id={l.id}
              y={l.y}
              state={l.state}
              x1={plotLeft}
              x2={plotRight}
            />
          ))}

          {/* Price path */}
          <g
            clipPath={`url(#afbPlotClip-${clipId})`}
            transform={`translate(${plotLeft}, 0)`}
          >
            <path
              d={path}
              fill="none"
              stroke="rgba(232,238,242,0.88)"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>

          <circle
            cx={plotRight - 2}
            cy={priceY}
            r={running ? 4 : 3}
            fill={
              tickDir === "up"
                ? TEAL
                : tickDir === "down"
                  ? ROSE
                  : "rgba(255,255,255,0.9)"
            }
            className={running ? "afb-intent-dot" : undefined}
          />

          {/* Left tags: quiet M + Live (up/down) */}
          {leftLabelsView.map((item) => (
            <PriceTag
              key={item.id}
              anchorX={plotLeft}
              y={item.y}
              lineY={item.lineY}
              text={item.display}
              style={item.style}
              side="left"
            />
          ))}

          {/* Right tags: Entry / Add / TP / SL */}
          {rightLabelsView.map((item) => (
            <PriceTag
              key={item.id}
              anchorX={plotRight}
              y={item.y}
              lineY={item.lineY}
              text={item.display}
              style={item.style}
              side="right"
            />
          ))}
        </svg>

        <div className="flex flex-wrap gap-3 border-t border-[var(--afb-line)] px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--afb-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-white/70" />
            Thinking
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-[var(--afb-teal)]" />
            Long / TP / up
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-[var(--afb-rose)]" />
            Short / down
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-[rgba(200,214,222,0.55)]" />
            SL
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-white/40" />
            Mean
          </span>
        </div>
      </div>
    </div>
  );
}
