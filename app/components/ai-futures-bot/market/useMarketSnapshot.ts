import { useEffect, useRef, useState } from "react";
import { useMarkPrice } from "@orderly.network/hooks";
import { buildSnapshot } from "./indicators";
import { fetchKlines, fetchMarkPrice } from "./orderlyPublic";
import type { Candle, MarketSnapshot, MarketTimeframe } from "./types";

const KLINE_POLL_MS = 30_000;
const MARK_POLL_MS = 8_000;

type UseMarketSnapshotOptions = {
  /** When false, skip client kline/mark fetches (bot page uses worker instead). */
  enabled?: boolean;
};

type UseMarketSnapshotResult = {
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
};

/**
 * Live Orderly public market snapshot for Pulse + intent chart.
 * Prefer SDK mark stream when available; REST fills klines + fallback price.
 */
export function useMarketSnapshot(
  symbol: string,
  timeframe: MarketTimeframe,
  opts?: UseMarketSnapshotOptions,
): UseMarketSnapshotResult {
  const enabled = opts?.enabled !== false;
  const { data: streamMark } = useMarkPrice(enabled ? symbol : "");
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const restMarkRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      candlesRef.current = [];
      return undefined;
    }

    let cancelled = false;
    const ac = new AbortController();

    const publish = (priceHint?: number) => {
      const candles = candlesRef.current;
      if (!candles.length) return;
      const price =
        (priceHint && priceHint > 0 ? priceHint : 0) ||
        (typeof streamMark === "number" && streamMark > 0 ? streamMark : 0) ||
        restMarkRef.current ||
        0;
      setSnapshot(
        buildSnapshot({
          symbol,
          timeframe,
          price,
          candles,
        }),
      );
    };

    const loadKlines = async () => {
      try {
        const candles = await fetchKlines(symbol, timeframe, {
          signal: ac.signal,
        });
        if (cancelled) return;
        candlesRef.current = candles;
        setError(null);
        publish();
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError"))
          return;
        setError(e instanceof Error ? e.message : "Failed to load klines");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadMark = async () => {
      try {
        const mark = await fetchMarkPrice(symbol, { signal: ac.signal });
        if (cancelled) return;
        restMarkRef.current = mark;
        publish(mark);
      } catch {
        // stream mark may still work
      }
    };

    setLoading(true);
    setSnapshot(null);
    candlesRef.current = [];
    restMarkRef.current = 0;
    void loadKlines();
    void loadMark();

    const klineTimer = window.setInterval(() => void loadKlines(), KLINE_POLL_MS);
    const markTimer = window.setInterval(() => void loadMark(), MARK_POLL_MS);

    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(klineTimer);
      window.clearInterval(markTimer);
    };
    // streamMark applied in the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!(typeof streamMark === "number" && streamMark > 0)) return;
    if (!candlesRef.current.length) return;
    setSnapshot(
      buildSnapshot({
        symbol,
        timeframe,
        price: streamMark,
        candles: candlesRef.current,
      }),
    );
  }, [streamMark, symbol, timeframe, enabled]);

  return { snapshot, loading, error };
}
