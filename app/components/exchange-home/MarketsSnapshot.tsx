import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MARKETS_URL, tradeUrl } from "@/config/exchange/urls";
import { symbolIconUrl } from "@/config/exchange/symbolIcon";
import { fetchMarketsSnapshot } from "@/lib/exchange/exchangeData";
import { updateSymbol } from "@/utils/storage";
import FearGreedGauge from "./FearGreedGauge";
import IdxMarkIcon from "./IdxMarkIcon";

function formatUsd(value: number | null) {
  if (!(value != null && value > 0)) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatPctChange(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "−"}${abs}%`;
}

function formatPct(value: number | null | undefined) {
  if (!(value != null && value >= 0)) return "—";
  return `${value.toFixed(0)}%`;
}

function formatPrice(price: number) {
  if (!(price > 0)) return "—";
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 5 })}`;
}

function GainerRow({
  item,
}: {
  item: {
    symbol: string;
    displaySymbol?: string;
    iconSymbol?: string;
    price: number;
    changePct: number;
  };
}) {
  const up = item.changePct >= 0;
  const label = item.displaySymbol || item.symbol;
  const iconKey = item.iconSymbol || label;

  return (
    <Link
      className="ex-markets-gainer-row"
      to={tradeUrl(item.symbol)}
      aria-label={`Trade ${label}`}
      onClick={() => updateSymbol(item.symbol)}
    >
      <div className="ex-markets-gainer-symbol">
        <img
          className="ex-markets-gainer-icon"
          src={symbolIconUrl(iconKey)}
          alt=""
          width={18}
          height={18}
          loading="lazy"
        />
        <span>{label}</span>
      </div>
      <span className="ex-markets-gainer-price">{formatPrice(item.price)}</span>
      <span
        className={`ex-markets-gainer-change${up ? " is-up" : " is-down"}`}
      >
        {formatPctChange(item.changePct)}
      </span>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ex-markets-stat-card">
      <p className="ex-markets-stat-label">
        <IdxMarkIcon size={15} />
        {label}
      </p>
      <p className="ex-markets-stat-value">{value}</p>
    </article>
  );
}

const EMPTY = {
  volume24h: null as number | null,
  openInterest: null as number | null,
  tvl: null as number | null,
  fearGreed: null as { value: number; label: string } | null,
  longShort: null as { longPct: number; shortPct: number } | null,
  gainers: [] as Array<{
    symbol: string;
    displaySymbol?: string;
    iconSymbol?: string;
    price: number;
    changePct: number;
  }>,
};

export default function MarketsSnapshot() {
  const [data, setData] = useState(EMPTY);
  const stackRef = useRef<HTMLDivElement>(null);
  const [stackHeight, setStackHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return undefined;

    const syncHeight = () => {
      const next = el.offsetHeight;
      setStackHeight((prev) => (prev === next ? prev : next));
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const body = await fetchMarketsSnapshot();
        if (!alive) return;
        setData({
          ...EMPTY,
          ...body,
          gainers: (body.gainers ?? []).filter(
            (item): item is NonNullable<typeof item> => item != null,
          ),
        });
      } catch {
        if (alive) setData(EMPTY);
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const longPct = data.longShort?.longPct;
  const shortPct = data.longShort?.shortPct;
  const longBias = longPct != null && longPct >= 50;

  return (
    <div className="ex-markets-snapshot-grid">
      <div ref={stackRef} className="ex-markets-stats-stack">
        <StatCard label="24h volume" value={formatUsd(data.volume24h)} />
        <StatCard label="Open interest" value={formatUsd(data.openInterest)} />
        <StatCard label="Assets (TVL)" value={formatUsd(data.tvl)} />
      </div>

      <article
        className="ex-markets-stat-card ex-markets-pulse-card"
        style={stackHeight ? { height: `${stackHeight}px` } : undefined}
      >
        <div className="ex-markets-pulse-inner">
          <div className="ex-markets-pulse-gauge">
            <p className="ex-markets-pulse-title">Fear &amp; Greed</p>
            <FearGreedGauge
              value={data.fearGreed?.value}
              label={data.fearGreed?.label}
            />
          </div>

          <div className="ex-markets-pulse-split" aria-hidden="true" />

          <div className="ex-markets-ls-block">
            <p className="ex-markets-stat-label">Long / Short</p>
            <p className="ex-markets-stat-value ex-markets-ls-value">
              {longPct != null
                ? `${formatPct(longPct)} / ${formatPct(shortPct)}`
                : "—"}
            </p>
            <div className="ex-markets-ls-bar" aria-hidden="true">
              <span
                className="ex-markets-ls-bar-fill"
                style={{ width: longPct != null ? `${longPct}%` : "50%" }}
              />
            </div>
            <p className="ex-markets-ls-hint">
              {longPct != null
                ? longBias
                  ? "Long bias"
                  : "Short bias"
                : "BTC accounts · Binance"}
            </p>
          </div>
        </div>
      </article>

      <article
        className="ex-markets-stat-card ex-markets-gainers-card"
        style={stackHeight ? { height: `${stackHeight}px` } : undefined}
      >
        <div className="ex-markets-gainers-inner">
          <div className="ex-markets-gainers-head">
            <p className="ex-markets-gainers-title">Top gainers</p>
            <Link className="ex-markets-gainers-link" to={MARKETS_URL}>
              Markets
            </Link>
          </div>
          <div className="ex-markets-gainers-list">
            {data.gainers?.length ? (
              data.gainers.map((item) => (
                <GainerRow key={item.symbol} item={item} />
              ))
            ) : (
              <p className="ex-markets-gainers-empty">—</p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
