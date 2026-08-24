import { sparklineCacheExpiresAt } from "@/lib/exchange/sparklineUtils";

const STORAGE_KEY = "idx-markets-sparklines-v1";

function readRaw(): Record<string, { closes: number[]; expiresAt: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRaw(data: Record<string, { closes: number[]; expiresAt: number }>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

function pruneRaw(raw: Record<string, { closes: number[]; expiresAt: number }>, now = Date.now()) {
  const next: Record<string, { closes: number[]; expiresAt: number }> = {};
  for (const [symbol, entry] of Object.entries(raw)) {
    if (
      entry?.expiresAt > now &&
      Array.isArray(entry.closes) &&
      entry.closes.length >= 2
    ) {
      next[symbol] = entry;
    }
  }
  return next;
}

export function readSparklineClientCache(): Record<string, number[]> {
  const now = Date.now();
  const raw = readRaw();
  const pruned = pruneRaw(raw, now);
  if (Object.keys(pruned).length !== Object.keys(raw).length) {
    writeRaw(pruned);
  }

  const out: Record<string, number[]> = {};
  for (const [symbol, entry] of Object.entries(pruned)) {
    out[symbol] = entry.closes;
  }
  return out;
}

export function writeSparklineClientCache(symbol: string, closes: number[]) {
  if (!symbol || !Array.isArray(closes) || closes.length < 2) return;
  const raw = pruneRaw(readRaw());
  raw[symbol] = { closes, expiresAt: sparklineCacheExpiresAt() };
  writeRaw(raw);
}
