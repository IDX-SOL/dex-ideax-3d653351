import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolveSymbolIconUrls } from "@/config/exchange/symbolIcon";
import { tradeUrl } from "@/config/exchange/urls";
import { fetchNewListings } from "@/lib/exchange/exchangeData";
import { updateSymbol } from "@/utils/storage";

type Listing = {
  symbol: string;
  displaySymbol?: string;
  leverage?: number | null;
  price: number;
  changePct: number;
  volume24h: number;
  openInterest: number;
  funding8h: number | null;
};

function compareListings(a: Listing, b: Listing, sortKey: string) {
  switch (sortKey) {
    case "market": {
      const av = String(a.displaySymbol || a.symbol || "").toLowerCase();
      const bv = String(b.displaySymbol || b.symbol || "").toLowerCase();
      return av.localeCompare(bv);
    }
    case "last":
      return (a.price ?? 0) - (b.price ?? 0);
    case "change":
      return (a.changePct ?? 0) - (b.changePct ?? 0);
    case "volume":
      return (a.volume24h ?? 0) - (b.volume24h ?? 0);
    case "oi":
      return (a.openInterest ?? 0) - (b.openInterest ?? 0);
    case "funding":
      return (a.funding8h ?? Number.NEGATIVE_INFINITY) - (b.funding8h ?? Number.NEGATIVE_INFINITY);
    default:
      return 0;
  }
}

function sortListings(
  list: Listing[],
  sortKey: string | null,
  sortDir: "asc" | "desc" | null,
) {
  if (!sortKey || !sortDir) return list;
  const sorted = [...list];
  sorted.sort((a, b) => {
    const cmp = compareListings(a, b, sortKey);
    return sortDir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

function SortArrows({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <svg
      className="ex-markets-new-listings-sort-icon"
      width="10"
      height="12"
      viewBox="0 0 10 12"
      aria-hidden="true"
    >
      <path
        className={`ex-markets-new-listings-sort-up${direction === "asc" ? " is-active" : ""}`}
        d="M5 1.25 8.75 5.25H1.25Z"
      />
      <path
        className={`ex-markets-new-listings-sort-down${direction === "desc" ? " is-active" : ""}`}
        d="M5 10.75 1.25 6.75h7.5Z"
      />
    </svg>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  activeDir,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: string;
  activeKey: string | null;
  activeDir: "asc" | "desc" | null;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const direction = active ? activeDir : null;

  return (
    <th
      scope="col"
      className={`ex-markets-new-listings-th-cell${className ? ` ${className}` : ""}${active ? " is-active" : ""}`}
      aria-sort={
        active
          ? activeDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className={`ex-markets-new-listings-th${active ? " is-active" : ""}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <SortArrows direction={direction} />
      </button>
    </th>
  );
}

function formatUsd(value: number) {
  if (!(value > 0)) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
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

function formatPctChange(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value).toFixed(2);
  return `${value >= 0 ? "+" : "−"}${abs}%`;
}

function formatFunding8h(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = value * 100;
  const abs = Math.abs(pct).toFixed(4);
  return `${pct >= 0 ? "+" : "−"}${abs}%`;
}

function ListingIcon({ symbol, label }: { symbol: string; label: string }) {
  const { primary, fallback } = resolveSymbolIconUrls(symbol);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setFailed(false);
  }, [primary]);

  if (failed) {
    return (
      <span className="ex-markets-grid-card-icon-fallback" aria-hidden="true">
        {(label || "?").slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      className="ex-markets-grid-card-icon"
      src={src}
      alt=""
      width={22}
      height={22}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (src !== fallback) {
          setSrc(fallback);
          return;
        }
        setFailed(true);
      }}
    />
  );
}

function ListingRow({ item }: { item: Listing }) {
  const navigate = useNavigate();
  const up = item.changePct >= 0;
  const fundingUp = (item.funding8h ?? 0) >= 0;
  const label = item.displaySymbol || item.symbol;

  const goToTrade = () => {
    updateSymbol(item.symbol);
    navigate(tradeUrl(item.symbol));
  };

  return (
    <tr
      className="ex-markets-new-listings-row"
      onClick={goToTrade}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToTrade();
        }
      }}
      tabIndex={0}
      aria-label={`Trade ${label}`}
    >
      <td className="ex-markets-new-listings-market">
        <ListingIcon symbol={item.symbol} label={label} />
        <span className="ex-markets-new-listings-symbol">{label}</span>
        {item.leverage != null ? (
          <span className="ex-markets-new-listings-leverage">{item.leverage}x</span>
        ) : null}
      </td>
      <td className="ex-markets-new-listings-cell ex-markets-new-listings-num">
        {formatPrice(item.price)}
      </td>
      <td
        className={`ex-markets-new-listings-cell ex-markets-new-listings-num${up ? " is-up" : " is-down"}`}
      >
        {formatPctChange(item.changePct)}
      </td>
      <td className="ex-markets-new-listings-cell ex-markets-new-listings-num">
        {formatUsd(item.volume24h)}
      </td>
      <td className="ex-markets-new-listings-cell ex-markets-new-listings-num ex-markets-new-listings-col--desktop">
        {formatUsd(item.openInterest)}
      </td>
      <td
        className={`ex-markets-new-listings-cell ex-markets-new-listings-num ex-markets-new-listings-col--desktop${item.funding8h != null ? (fundingUp ? " is-up" : " is-down") : ""}`}
      >
        {formatFunding8h(item.funding8h)}
      </td>
    </tr>
  );
}

export default function NewListingsStack() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [sort, setSort] = useState<{
    key: string | null;
    dir: "asc" | "desc" | null;
  }>({ key: null, dir: "desc" });

  const sortedListings = useMemo(
    () => sortListings(listings, sort.key, sort.dir),
    [listings, sort.key, sort.dir],
  );

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) {
        return { key, dir: "desc" };
      }
      if (prev.dir === "desc") {
        return { key, dir: "asc" };
      }
      return { key: null, dir: "desc" };
    });
  };

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const body = await fetchNewListings();
        if (!alive) return;
        setListings(Array.isArray(body.listings) ? (body.listings as Listing[]) : []);
      } catch {
        if (alive) setListings([]);
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="ex-markets-new-listings-stack">
      <article className="ex-markets-stat-card ex-markets-new-listings-card">
        <div className="ex-markets-new-listings-inner">
          <p className="ex-markets-new-listings-title">New listings</p>

          <table className="ex-markets-new-listings-table">
            <thead>
              <tr>
                <SortHeader
                  label="Market"
                  sortKey="market"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Last"
                  sortKey="last"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                  className="is-num"
                />
                <SortHeader
                  label="24h %"
                  sortKey="change"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                  className="is-num"
                />
                <SortHeader
                  label="24h vol"
                  sortKey="volume"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                  className="is-num"
                />
                <SortHeader
                  label="Open int."
                  sortKey="oi"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                  className="is-num ex-markets-new-listings-col--desktop"
                />
                <SortHeader
                  label="8h funding"
                  sortKey="funding"
                  activeKey={sort.key}
                  activeDir={sort.dir}
                  onSort={handleSort}
                  className="is-num ex-markets-new-listings-col--desktop"
                />
              </tr>
            </thead>
            <tbody>
              {sortedListings.length ? (
                sortedListings.map((item) => (
                  <ListingRow key={item.symbol} item={item} />
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="ex-markets-new-listings-empty">
                    <p className="ex-markets-gainers-empty">—</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
