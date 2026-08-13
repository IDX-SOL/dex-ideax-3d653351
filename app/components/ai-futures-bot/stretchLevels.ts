/**
 * Match IdxExchangeBot stretch-fade geometry (fractions of D).
 * Used for live chart planning — not cosmetic % offsets.
 */

import {
  MAX_TP_OVERSHOOT_D,
  MIN_NET_TP_PCT,
  STRETCH_ADD_D,
  STRETCH_ENTRY_D,
  STRETCH_EXIT_D,
  STRETCH_SL_D,
} from "./market/types";

const IDX_TAKER = 0.0015;

export type StretchSide = "long" | "short";

export type StretchGeometry = {
  entryD: number;
  addD: number;
  exitD: number;
  slD: number;
  minNetTpPct: number;
  maxTpOvershootD: number;
  takerFeeRate: number;
};

export const DEFAULT_STRETCH_GEOMETRY: StretchGeometry = {
  entryD: STRETCH_ENTRY_D,
  addD: STRETCH_ADD_D,
  exitD: STRETCH_EXIT_D,
  slD: STRETCH_SL_D,
  minNetTpPct: MIN_NET_TP_PCT,
  maxTpOvershootD: MAX_TP_OVERSHOOT_D,
  takerFeeRate: IDX_TAKER,
};

export type StretchLevels = {
  entry: number;
  add: number;
  tp: number;
  sl: number;
};

function feeBreakEvenTp(
  side: StretchSide,
  entry: number,
  taker: number,
): number {
  if (!(entry > 0)) return 0;
  const t = taker;
  if (side === "long") return (entry * (1 + t)) / (1 - t);
  return (entry * (1 - t)) / (1 + t);
}

/** TP at/near M only — never force past M for min-net. */
function paddedTp(
  side: StretchSide,
  mean: number,
  avgEntry: number,
  d: number,
  geo: StretchGeometry,
): number {
  if (!(avgEntry > 0) || !(mean > 0)) return 0;
  const be = feeBreakEvenTp(side, avgEntry, geo.takerFeeRate);
  if (side === "long") {
    const natural = mean - geo.exitD * d;
    return Math.min(mean, Math.max(natural, Math.min(be, mean)));
  }
  const natural = mean + geo.exitD * d;
  return Math.max(mean, Math.min(natural, Math.max(be, mean)));
}

/** Engine-style TP/SL from M, D, and avg entry. */
export function computeTpSl(opts: {
  side: StretchSide;
  mean: number;
  dailyTrMed: number;
  avgEntry: number;
  geo?: StretchGeometry;
}): { tp: number; sl: number } {
  const geo = opts.geo ?? DEFAULT_STRETCH_GEOMETRY;
  const { side, mean, avgEntry } = opts;
  const d = Math.max(opts.dailyTrMed, Math.abs(mean) * 0.002, 1e-8);
  if (side === "long") {
    let tp = paddedTp("long", mean, avgEntry, d, geo);
    if (!(tp > 0)) tp = mean - geo.exitD * d;
    let sl = mean - geo.slD * d;
    if (avgEntry > 0) sl = Math.min(sl, avgEntry - 0.08 * d);
    return { tp, sl };
  }
  let tp = paddedTp("short", mean, avgEntry, d, geo);
  if (!(tp > 0)) tp = mean + geo.exitD * d;
  let sl = mean + geo.slD * d;
  if (avgEntry > 0) sl = Math.max(sl, avgEntry + 0.08 * d);
  return { tp, sl };
}

/** Planned levels from live M / D (follow the market). */
export function plannedStretchLevels(
  side: StretchSide,
  mean: number,
  dailyTrMed: number,
  geo: StretchGeometry = DEFAULT_STRETCH_GEOMETRY,
): StretchLevels {
  const d = Math.max(dailyTrMed, Math.abs(mean) * 0.002, 1e-8);
  const entry =
    side === "long" ? mean - geo.entryD * d : mean + geo.entryD * d;
  const add = side === "long" ? mean - geo.addD * d : mean + geo.addD * d;
  const { tp, sl } = computeTpSl({
    side,
    mean,
    dailyTrMed: d,
    avgEntry: entry,
    geo,
  });
  return { entry, add, tp, sl };
}
