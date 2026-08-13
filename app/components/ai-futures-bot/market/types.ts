/** Shared market snapshot shape for UI now and engine later. */

export type MarketTimeframe = "5m" | "15m" | "1h";

export type Candle = {
  /** Open time in ms */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  /** Base volume */
  v: number;
  /** Quote notional (USDC) */
  a: number;
};

export type MarketSnapshot = {
  symbol: string;
  timeframe: MarketTimeframe;
  price: number;
  candles: Candle[];
  /** VWAP-like mean M from Orderly candles */
  meanM: number;
  atr: number;
  /** Distance from M in × D (daily TR multiples; local demo may use ATR) */
  stretchAtr: number;
  /** UI stretch 0..1 (normalized vs stretchFullAtr) */
  stretch: number;
  /** Fade bias from live Px vs M */
  side: "long" | "short" | null;
  ts: number;
};

/**
 * Offline fallback — must match IdxExchangeBot config.py.
 * Live chart prefers GET /v1/strategy/config.
 */
export const STRETCH_FULL_ATR = 1.1;
export const STRETCH_ENTRY_D = 0.8;
export const STRETCH_ADD_D = 0.95;
export const STRETCH_EXIT_D = 0.0;
export const STRETCH_SL_D = 1.1;
/** Enter gate vs fade-to-M; not used to push TP past M */
export const MIN_NET_TP_PCT = 0.025;
export const MAX_TP_OVERSHOOT_D = 0.0;
export const ATR_PERIOD = 14;
