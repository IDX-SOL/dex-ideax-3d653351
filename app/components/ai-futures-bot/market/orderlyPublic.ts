import type { Candle, MarketTimeframe } from "./types";

const NETWORK_ID_KEY = "orderly_network_id";

type NetworkId = "mainnet" | "testnet";

function getNetworkId(): NetworkId {
  if (typeof window === "undefined") return "mainnet";
  const stored = localStorage.getItem(NETWORK_ID_KEY);
  return stored === "testnet" ? "testnet" : "mainnet";
}

export function getOrderlyRestBase(network?: NetworkId): string {
  const id = network ?? getNetworkId();
  return id === "testnet"
    ? "https://testnet-api.orderly.org"
    : "https://api.orderly.org";
}

/** Bars needed for ~24h VWAP window by timeframe. */
export function barsForWindow(tf: MarketTimeframe): number {
  switch (tf) {
    case "5m":
      return 288;
    case "15m":
      return 96;
    case "1h":
      return 24;
    default:
      return 96;
  }
}

function secondsPerBar(tf: MarketTimeframe): number {
  switch (tf) {
    case "5m":
      return 300;
    case "15m":
      return 900;
    case "1h":
      return 3600;
    default:
      return 900;
  }
}

/** Extra bars so Wilder ATR has warmup beyond the VWAP window. */
const ATR_PAD = 20;

type TvKlineResponse = {
  s?: string;
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  a?: number[];
  t?: number[];
  errmsg?: string;
};

function parseTvKlines(data: TvKlineResponse): Candle[] {
  if (data.s !== "ok" || !data.t?.length) return [];
  const n = data.t.length;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      t: data.t[i] * 1000,
      o: Number(data.o?.[i] ?? 0),
      h: Number(data.h?.[i] ?? 0),
      l: Number(data.l?.[i] ?? 0),
      c: Number(data.c?.[i] ?? 0),
      v: Number(data.v?.[i] ?? 0),
      a: Number(data.a?.[i] ?? 0),
    });
  }
  return out;
}

/** Public TradingView-compatible kline history (no auth). */
export async function fetchKlines(
  symbol: string,
  timeframe: MarketTimeframe,
  opts?: { limit?: number; signal?: AbortSignal },
): Promise<Candle[]> {
  const limit = Math.min(1000, opts?.limit ?? barsForWindow(timeframe) + ATR_PAD);
  const to = Math.floor(Date.now() / 1000);
  const from = to - secondsPerBar(timeframe) * limit;
  const base = getOrderlyRestBase();
  const url = new URL(`${base}/v1/tv/kline_history`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("resolution", timeframe);
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { signal: opts?.signal });
  if (!res.ok) {
    throw new Error(`kline HTTP ${res.status}`);
  }
  const data = (await res.json()) as TvKlineResponse;
  if (data.s && data.s !== "ok") {
    throw new Error(data.errmsg || `kline status ${data.s}`);
  }
  return parseTvKlines(data);
}

type FuturesMarketRow = {
  symbol?: string;
  mark_price?: number;
  index_price?: number;
  "24h_close"?: number;
};

/** Public mark / last-ish price from futures market list. */
export async function fetchMarkPrice(
  symbol: string,
  opts?: { signal?: AbortSignal },
): Promise<number> {
  const base = getOrderlyRestBase();
  const url = new URL(`${base}/v1/public/futures_market`);
  url.searchParams.set("symbol", symbol);
  const res = await fetch(url.toString(), { signal: opts?.signal });
  if (!res.ok) {
    throw new Error(`futures_market HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    success?: boolean;
    data?: { rows?: FuturesMarketRow[] };
  };
  const row = body.data?.rows?.find((r) => r.symbol === symbol) ??
    body.data?.rows?.[0];
  const price =
    Number(row?.mark_price) ||
    Number(row?.index_price) ||
    Number(row?.["24h_close"]) ||
    0;
  if (!(price > 0)) {
    throw new Error(`no mark price for ${symbol}`);
  }
  return price;
}
