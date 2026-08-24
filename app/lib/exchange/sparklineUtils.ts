export const SPARKLINE_BARS = 24;
export const SPARKLINE_BAR_SEC = 900;

export function nextBarExpiryMs(now = Date.now()) {
  const d = new Date(now);
  const minutes = d.getUTCMinutes();
  const seconds = d.getUTCSeconds();
  const ms = d.getUTCMilliseconds();
  const elapsedInBar = (minutes % 15) * 60_000 + seconds * 1000 + ms;
  const remaining = SPARKLINE_BAR_SEC * 1000 - elapsedInBar;
  return now + (remaining > 0 ? remaining : SPARKLINE_BAR_SEC * 1000);
}

export function sparklineCacheExpiresAt(now = Date.now()) {
  return nextBarExpiryMs(now);
}

export function sparklineCacheMaxAgeSec(now = Date.now()) {
  return Math.max(1, Math.ceil((nextBarExpiryMs(now) - now) / 1000));
}

export function ohlcFallbackSparkline(market: {
  open24h?: number;
  price?: number;
  low24h?: number;
  high24h?: number;
}) {
  const open = Number(market?.open24h);
  const close = Number(market?.price);
  if (!(open > 0) || !(close > 0)) return [];

  const low = Math.min(market.low24h && market.low24h > 0 ? market.low24h : open, open, close);
  const high = Math.max(market.high24h && market.high24h > 0 ? market.high24h : open, open, close);

  const anchors = [open, low, high, close];
  const out: number[] = [];
  for (let i = 0; i < SPARKLINE_BARS; i += 1) {
    const t = i / (SPARKLINE_BARS - 1);
    const pos = t * (anchors.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, anchors.length - 1);
    const frac = pos - i0;
    out.push(anchors[i0] * (1 - frac) + anchors[i1] * frac);
  }
  return out;
}
