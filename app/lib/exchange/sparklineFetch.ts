import { binanceFuturesSymbol } from "@/lib/exchange/sparklineBinance";
import {
  SPARKLINE_BAR_SEC,
  SPARKLINE_BARS,
  sparklineCacheExpiresAt,
} from "@/lib/exchange/sparklineUtils";

const BINANCE_KLINE_URL = "https://fapi.binance.com/fapi/v1/klines";
const ORDERLY_KLINE_URL = "https://api.orderly.org/v1/tv/kline_history";
const ORDERLY_RESOLUTION = "15m";
const ORDERLY_KLINE_GAP_MS = 2500;
const ORDERLY_COOLDOWN_DEFAULT_MS = 15_000;

const cache = new Map<string, { closes: number[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<number[]>>();
let orderlyQueue: Promise<void> = Promise.resolve();
let batchGate = Promise.resolve();
let orderlyCooldownUntil = 0;

function parseOrderlyCloses(data: { s?: string; c?: unknown[] }) {
  if (data.s !== "ok" || !Array.isArray(data.c)) return [];
  return data.c.map(Number).filter((n) => Number.isFinite(n) && n > 0);
}

function parseBinanceCloses(data: unknown[]) {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => Number((row as unknown[])?.[4]))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function getCached(symbol: string) {
  const entry = cache.get(symbol);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.closes;
}

function setCached(symbol: string, closes: number[]) {
  if (closes.length) {
    cache.set(symbol, { closes, expiresAt: sparklineCacheExpiresAt() });
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setOrderlyCooldownFromResponse(res: Response) {
  const retryAfter = Number(res.headers.get("retry-after"));
  const ms =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : ORDERLY_COOLDOWN_DEFAULT_MS;
  orderlyCooldownUntil = Math.max(orderlyCooldownUntil, Date.now() + ms);
}

function runInOrderlyQueue<T>(task: () => Promise<T>) {
  const result = orderlyQueue.then(async () => {
    const waitMs = orderlyCooldownUntil - Date.now();
    if (waitMs > 0) await wait(waitMs);
    return task();
  });
  orderlyQueue = result
    .then(() => undefined)
    .then(() => wait(ORDERLY_KLINE_GAP_MS))
    .catch(() => wait(ORDERLY_KLINE_GAP_MS))
    .then(() => undefined);
  return result;
}

async function requestBinanceKline(orderlySymbol: string) {
  const binanceSymbol = binanceFuturesSymbol(orderlySymbol);
  if (!binanceSymbol) return [];

  const url = new URL(BINANCE_KLINE_URL);
  url.searchParams.set("symbol", binanceSymbol);
  url.searchParams.set("interval", "15m");
  url.searchParams.set("limit", String(SPARKLINE_BARS));

  try {
    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = await res.json();
    const closes = parseBinanceCloses(data);
    if (closes.length <= SPARKLINE_BARS) return closes;
    return closes.slice(-SPARKLINE_BARS);
  } catch {
    return [];
  }
}

async function requestOrderlyKline(symbol: string) {
  return runInOrderlyQueue(async () => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - SPARKLINE_BAR_SEC * SPARKLINE_BARS;
    const url = new URL(ORDERLY_KLINE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("resolution", ORDERLY_RESOLUTION);
    url.searchParams.set("from", String(from));
    url.searchParams.set("to", String(to));
    url.searchParams.set("limit", String(SPARKLINE_BARS));

    const res = await fetch(url.toString(), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 429) setOrderlyCooldownFromResponse(res);
      return { closes: [] as number[], rateLimited: res.status === 429 };
    }

    const data = await res.json();
    const closes = parseOrderlyCloses(data);

    if (closes.length <= SPARKLINE_BARS) return { closes, rateLimited: false };
    return { closes: closes.slice(-SPARKLINE_BARS), rateLimited: false };
  });
}

async function fetchSparklineFromProviders(symbol: string) {
  const binanceCloses = await requestBinanceKline(symbol);
  if (binanceCloses.length >= 2) return binanceCloses;

  const { closes, rateLimited } = await requestOrderlyKline(symbol);
  if (!rateLimited && closes.length >= 2) return closes;
  return [];
}

export async function fetchSparklineCloses(symbol: string) {
  const cached = getCached(symbol);
  if (cached) return cached;

  const pending = inFlight.get(symbol);
  if (pending) return pending;

  const promise = (async () => {
    const closes = await fetchSparklineFromProviders(symbol);
    if (closes.length >= 2) {
      setCached(symbol, closes);
      return closes;
    }
    return [];
  })().finally(() => {
    inFlight.delete(symbol);
  });

  inFlight.set(symbol, promise);
  return promise;
}

export async function fetchSparklinesBatch(symbols: string[]) {
  const prev = batchGate;
  let releaseBatch!: () => void;
  batchGate = new Promise((resolve) => {
    releaseBatch = resolve;
  });
  await prev;

  try {
    const unique = [...new Set(symbols.filter(Boolean))].slice(0, 12);
    const sparklines: Record<string, number[]> = {};

    await Promise.all(
      unique.map(async (symbol) => {
        sparklines[symbol] = await fetchSparklineCloses(symbol);
      }),
    );

    return sparklines;
  } finally {
    releaseBatch();
  }
}
