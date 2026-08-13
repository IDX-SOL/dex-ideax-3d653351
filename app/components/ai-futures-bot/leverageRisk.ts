/** Match IdxExchangeBot config: default 3×, max 10×. */
export const MIN_LEVERAGE = 1;
export const MAX_LEVERAGE = 10;
export const DEFAULT_LEVERAGE = 3;

export type LeverageRiskBand = "Calm" | "Elevated" | "High";

export function leverageRiskBand(lev: number): LeverageRiskBand {
  if (lev <= 3) return "Calm";
  if (lev <= 6) return "Elevated";
  return "High";
}

/**
 * Rough full-idea SL impact as % of free balance (both legs).
 * notional ≈ avail × riskFrac × lev; net SL ≈ (0.10×D/price + 0.30% fees).
 */
export function estimateFullIdeaSlPct(opts: {
  leverage: number;
  availableUsdc?: number | null;
  price?: number | null;
  dailyTrMed?: number | null;
  /** Mid dynamic risk when stretch unknown */
  riskFraction?: number;
}): number | null {
  const avail = opts.availableUsdc ?? 0;
  const price = opts.price ?? 0;
  const d = opts.dailyTrMed ?? 0;
  const lev = opts.leverage;
  const rf = opts.riskFraction ?? 0.6;
  if (!(avail > 0) || !(price > 0) || !(lev > 0)) return null;
  const notional = avail * rf * lev;
  const movePct = d > 0 ? (0.1 * d) / price : 0.004;
  const netLossFrac = movePct + 0.003;
  return (notional * netLossFrac * 100) / avail;
}

export function formatLevRiskHint(
  lev: number,
  slPct: number | null,
): string {
  const band = leverageRiskBand(lev);
  if (slPct == null || !Number.isFinite(slPct)) {
    return `${band} · full idea SL scales with balance`;
  }
  const x = slPct >= 10 ? slPct.toFixed(0) : slPct.toFixed(1);
  return `${band} · full idea SL (both legs) ≈ −${x}% of free balance`;
}
