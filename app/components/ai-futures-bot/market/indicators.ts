import { barsForWindow } from "./orderlyPublic";
import {
  ATR_PERIOD,
  STRETCH_FULL_ATR,
  type Candle,
  type MarketSnapshot,
  type MarketTimeframe,
} from "./types";

/** Session / window VWAP from Orderly klines (quote amount / base volume). */
export function computeVwap(candles: Candle[]): number {
  let quote = 0;
  let base = 0;
  for (const c of candles) {
    if (c.v > 0 && c.a > 0) {
      quote += c.a;
      base += c.v;
    } else if (c.v > 0) {
      const typical = (c.h + c.l + c.c) / 3;
      quote += typical * c.v;
      base += c.v;
    }
  }
  if (base <= 0) {
    return candles.length ? candles[candles.length - 1].c : 0;
  }
  return quote / base;
}

/** Wilder ATR from OHLC candles. */
export function computeAtr(candles: Candle[], period = ATR_PERIOD): number {
  if (candles.length < 2) return 0;

  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const { h, l, c } = candles[i];
    const prevClose = i === 0 ? c : candles[i - 1].c;
    trs.push(Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose)));
  }

  const n = Math.min(period, trs.length);
  let atr = trs.slice(0, n).reduce((s, x) => s + x, 0) / n;
  for (let i = n; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function normalizeStretch(
  stretchAtr: number,
  fullAtr = STRETCH_FULL_ATR,
): number {
  if (!Number.isFinite(stretchAtr) || fullAtr <= 0) return 0;
  return Math.max(0, Math.min(1, stretchAtr / fullAtr));
}

export function fadeSide(
  price: number,
  meanM: number,
  deadbandAtr = 0.15,
  atr = 0,
): "long" | "short" | null {
  const band = atr > 0 ? atr * deadbandAtr : meanM * 0.0005;
  const delta = price - meanM;
  if (Math.abs(delta) <= band) return null;
  return delta < 0 ? "long" : "short";
}

/**
 * VWAP over ~12h window; ATR over full series (incl. warmup bars).
 * `candles` should be chronological oldest→newest.
 */
export function buildSnapshot(input: {
  symbol: string;
  timeframe: MarketTimeframe;
  price: number;
  candles: Candle[];
  ts?: number;
}): MarketSnapshot {
  const windowBars = barsForWindow(input.timeframe);
  const windowed =
    input.candles.length > windowBars
      ? input.candles.slice(input.candles.length - windowBars)
      : input.candles;
  const meanM = computeVwap(windowed);
  const atr = computeAtr(input.candles);
  const price =
    input.price > 0
      ? input.price
      : windowed.length
        ? windowed[windowed.length - 1].c
        : meanM;
  const stretchAtr = atr > 0 ? Math.abs(price - meanM) / atr : 0;
  return {
    symbol: input.symbol,
    timeframe: input.timeframe,
    price,
    candles: windowed,
    meanM,
    atr,
    stretchAtr,
    stretch: normalizeStretch(stretchAtr),
    side: fadeSide(price, meanM, 0.15, atr),
    ts: input.ts ?? Date.now(),
  };
}
