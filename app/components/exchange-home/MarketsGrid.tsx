import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMarketsGrid } from "@/lib/exchange/exchangeData";
import {
  fetchSparklineCloses,
  mapSparklinesConcurrent,
} from "@/lib/exchange/sparklineFetch";
import {
  readSparklineClientCache,
  writeSparklineClientCache,
} from "@/lib/exchange/sparklineClientCache";
import MarketCard from "./MarketCard";

const PAGE_SIZE = 12;
const POLL_MS = 60_000;
const SPARKLINE_RETRY_MS = 18_000;

const FILTERS = [
  { id: "all", label: "All markets" },
  { id: "tradfi", label: "TradFi" },
  { id: "crypto", label: "Crypto" },
] as const;

const sparklineInflightBySymbol = new Map<string, Promise<number[]>>();

type Market = {
  symbol: string;
  displaySymbol: string;
  iconSymbol?: string;
  changePct: number;
  volume24h: number;
  price: number;
  high24h: number;
  low24h: number;
  openInterest: number;
  fundingRate: number | null;
  isTradFi: boolean;
};

function filterMarkets(markets: Market[], filterId: string) {
  if (filterId === "tradfi") {
    return markets.filter((m) => m.isTradFi);
  }
  if (filterId === "crypto") {
    return markets.filter((m) => !m.isTradFi);
  }
  return markets;
}

function symbolsKey(items: Market[]) {
  return items.map((m) => m.symbol).join(",");
}

function hasRealSparkline(sparklines: Record<string, number[]>, symbol: string) {
  return (sparklines[symbol]?.length ?? 0) >= 2;
}

function missingMarkets(items: Market[], sparklines: Record<string, number[]>) {
  return items.filter((m) => !hasRealSparkline(sparklines, m.symbol));
}

function fetchSparklineDeduped(symbol: string) {
  const pending = sparklineInflightBySymbol.get(symbol);
  if (pending) return pending;

  const promise = fetchSparklineCloses(symbol).finally(() => {
    sparklineInflightBySymbol.delete(symbol);
  });
  sparklineInflightBySymbol.set(symbol, promise);
  return promise;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function MarketsGrid() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [slideDir, setSlideDir] = useState(0);
  const [sparklines, setSparklines] = useState(() => readSparklineClientCache());
  const [fetchingSymbols, setFetchingSymbols] = useState(() => new Set<string>());
  const gridRef = useRef<HTMLDivElement>(null);
  const sparklinesRef = useRef(sparklines);
  const warmedSymbolsRef = useRef(new Set<string>());
  const warmQueueRef = useRef<string[]>([]);
  const warmRunningRef = useRef(false);
  const warmAliveRef = useRef(true);
  const visibleFetchingRef = useRef(false);
  const sparklineInflightRef = useRef<string | null>(null);

  sparklinesRef.current = sparklines;

  const filtered = useMemo(
    () => filterMarkets(markets, filter),
    [markets, filter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () =>
      filtered.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
      ),
    [filtered, safePage],
  );

  const pageSymbolsKey = useMemo(() => symbolsKey(pageItems), [pageItems]);

  const applySparkline = useCallback((symbol: string, closes: number[]) => {
    if (!symbol || closes.length < 2) return;
    writeSparklineClientCache(symbol, closes);
    setSparklines((prev) => ({ ...prev, [symbol]: closes }));
  }, []);

  const shouldSkipWarm = useCallback((symbol: string) => {
    if (hasRealSparkline(sparklinesRef.current, symbol)) return true;
    if (warmedSymbolsRef.current.has(symbol)) return true;
    if (warmQueueRef.current.includes(symbol)) return true;
    if (sparklineInflightBySymbol.has(symbol)) return true;
    return false;
  }, []);

  const runWarmQueue = useCallback(async () => {
    if (warmRunningRef.current) return;
    warmRunningRef.current = true;

    while (warmQueueRef.current.length && warmAliveRef.current) {
      if (visibleFetchingRef.current) {
        await wait(400);
        continue;
      }

      const symbol = warmQueueRef.current.shift();
      if (!symbol || shouldSkipWarm(symbol)) continue;

      warmedSymbolsRef.current.add(symbol);

      try {
        const closes = await fetchSparklineDeduped(symbol);
        if (!warmAliveRef.current) break;
        if (closes.length >= 2) {
          applySparkline(symbol, closes);
        } else {
          warmedSymbolsRef.current.delete(symbol);
        }
      } catch {
        warmedSymbolsRef.current.delete(symbol);
      }
    }

    warmRunningRef.current = false;
  }, [applySparkline, shouldSkipWarm]);

  const enqueueWarmSymbols = useCallback(
    (symbols: string[], { priority = false } = {}) => {
      const list = [...new Set(symbols.filter(Boolean))];
      const toAdd = list.filter((symbol) => !shouldSkipWarm(symbol));
      if (!toAdd.length) return;

      for (const symbol of toAdd) {
        warmQueueRef.current = warmQueueRef.current.filter((s) => s !== symbol);
      }

      if (priority) {
        warmQueueRef.current.unshift(...toAdd);
      } else {
        warmQueueRef.current.push(...toAdd);
      }

      void runWarmQueue();
    },
    [runWarmQueue, shouldSkipWarm],
  );

  useEffect(() => {
    warmAliveRef.current = true;
    return () => {
      warmAliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  useEffect(() => {
    let alive = true;

    const loadMarkets = async () => {
      try {
        const body = await fetchMarketsGrid();
        if (!alive) return;
        setMarkets(Array.isArray(body.markets) ? (body.markets as Market[]) : []);
      } catch {
        if (alive) setMarkets([]);
      }
    };

    loadMarkets();
    const id = setInterval(loadMarkets, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!pageSymbolsKey || !markets.length) return undefined;

    let alive = true;
    const missing = missingMarkets(pageItems, sparklinesRef.current);

    if (!missing.length) {
      return undefined;
    }

    if (sparklineInflightRef.current === pageSymbolsKey) {
      return undefined;
    }
    sparklineInflightRef.current = pageSymbolsKey;

    const load = async (marketsToFetch: Market[]) => {
      visibleFetchingRef.current = true;
      setFetchingSymbols((prev) => {
        const next = new Set(prev);
        marketsToFetch.forEach((market) => next.add(market.symbol));
        return next;
      });

      try {
        await mapSparklinesConcurrent(marketsToFetch, async (market) => {
          const { symbol } = market;
          try {
            const closes = await fetchSparklineDeduped(symbol);
            if (!alive) return;
            if (closes.length >= 2) {
              applySparkline(symbol, closes);
              warmedSymbolsRef.current.add(symbol);
            }
          } catch {
            /* ignore per-symbol failures */
          } finally {
            if (!alive) return;
            setFetchingSymbols((prev) => {
              const next = new Set(prev);
              next.delete(symbol);
              return next;
            });
          }
        });
      } finally {
        visibleFetchingRef.current = false;
        if (alive && sparklineInflightRef.current === pageSymbolsKey) {
          sparklineInflightRef.current = null;
        }
      }
    };

    let retryId: number;

    const run = async () => {
      await load(missing);
      if (!alive) return;
      retryId = window.setTimeout(async () => {
        if (!alive) return;
        const stillMissing = missingMarkets(pageItems, sparklinesRef.current);
        if (stillMissing.length) await load(stillMissing);
      }, SPARKLINE_RETRY_MS);
    };

    void run();

    return () => {
      alive = false;
      if (retryId) window.clearTimeout(retryId);
    };
  }, [pageSymbolsKey, markets.length, pageItems, applySparkline]);

  const warmPageByIndex = useCallback(
    (pageIndex: number) => {
      if (pageIndex < 0 || pageIndex >= totalPages) return;
      const items = filtered.slice(
        pageIndex * PAGE_SIZE,
        pageIndex * PAGE_SIZE + PAGE_SIZE,
      );
      const symbols = missingMarkets(items, sparklinesRef.current).map(
        (m) => m.symbol,
      );
      if (symbols.length) enqueueWarmSymbols(symbols, { priority: true });
    },
    [filtered, totalPages, enqueueWarmSymbols],
  );

  const goToPage = (nextPage: number) => {
    if (nextPage === safePage) return;
    setSlideDir(nextPage > safePage ? 1 : -1);
    setPage(nextPage);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const onFilterChange = (id: string) => {
    setFilter(id);
    setSlideDir(0);
    setPage(0);
  };

  return (
    <div className="ex-markets-grid-stack" ref={gridRef}>
      <div className="ex-markets-grid-filters" role="tablist" aria-label="Market type">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`ex-markets-grid-filter${filter === item.id ? " is-active" : ""}`}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="ex-markets-grid-viewport">
        <div
          key={pageSymbolsKey}
          className={`ex-markets-grid${
            slideDir === 1
              ? " is-slide-next"
              : slideDir === -1
                ? " is-slide-prev"
                : ""
          }`}
        >
          {pageItems.length ? (
            pageItems.map((market) => {
              const hasChart = hasRealSparkline(sparklines, market.symbol);
              const closes = hasChart ? sparklines[market.symbol] : undefined;

              return (
                <MarketCard
                  key={market.symbol}
                  market={market}
                  closes={closes}
                  sparklineLoading={
                    !hasChart && fetchingSymbols.has(market.symbol)
                  }
                />
              );
            })
          ) : (
            <p className="ex-markets-grid-empty">—</p>
          )}
        </div>
      </div>

      {filtered.length > PAGE_SIZE ? (
        <nav className="ex-markets-grid-pager" aria-label="Markets pages">
          <button
            type="button"
            className="ex-markets-grid-pager-btn"
            disabled={safePage <= 0}
            onMouseEnter={() => warmPageByIndex(safePage - 1)}
            onFocus={() => warmPageByIndex(safePage - 1)}
            onClick={() => goToPage(safePage - 1)}
          >
            Previous
          </button>
          <span className="ex-markets-grid-pager-label">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="ex-markets-grid-pager-btn"
            disabled={safePage >= totalPages - 1}
            onMouseEnter={() => warmPageByIndex(safePage + 1)}
            onFocus={() => warmPageByIndex(safePage + 1)}
            onClick={() => goToPage(safePage + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
