import { useState } from "react";
import { Link } from "react-router-dom";
import { symbolIconUrl } from "@/config/exchange/symbolIcon";
import { tradeUrl } from "@/config/exchange/urls";
import { updateSymbol } from "@/utils/storage";
import MiniSparkline from "./MiniSparkline";

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

function formatFundingRate(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const pct = value * 100;
  const abs = Math.abs(pct).toFixed(4);
  return `${pct >= 0 ? "+" : "−"}${abs}%`;
}

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
};

export default function MarketCard({
  market,
  closes,
  sparklineLoading,
}: {
  market: Market;
  closes?: number[];
  sparklineLoading?: boolean;
}) {
  const up = market.changePct >= 0;
  const fundingUp = (market.fundingRate ?? 0) >= 0;
  const iconKey = market.iconSymbol || market.displaySymbol;
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <Link
      className="ex-markets-grid-card"
      to={tradeUrl(market.symbol)}
      aria-label={`Trade ${market.displaySymbol}`}
      onClick={() => updateSymbol(market.symbol)}
    >
      <div className="ex-markets-grid-card-head">
        {!iconFailed ? (
          <img
            className="ex-markets-grid-card-icon"
            src={symbolIconUrl(iconKey)}
            alt=""
            width={22}
            height={22}
            loading="eager"
            decoding="async"
            onError={() => setIconFailed(true)}
          />
        ) : (
          <span className="ex-markets-grid-card-icon-fallback" aria-hidden="true">
            {market.displaySymbol.slice(0, 1)}
          </span>
        )}
        <span className="ex-markets-grid-card-symbol">{market.displaySymbol}</span>
        <span
          className={`ex-markets-grid-card-change${up ? " is-up" : " is-down"}`}
        >
          {formatPctChange(market.changePct)}
        </span>
      </div>

      <MiniSparkline closes={closes} up={up} loading={sparklineLoading} />

      <div className="ex-markets-grid-card-stats">
        <div className="ex-markets-grid-stat">
          <span className="ex-markets-grid-stat-label">24h vol</span>
          <span className="ex-markets-grid-stat-value">
            {formatUsd(market.volume24h)}
          </span>
        </div>
        <div className="ex-markets-grid-stat">
          <span className="ex-markets-grid-stat-label">Price</span>
          <span className="ex-markets-grid-stat-value">
            {formatPrice(market.price)}
          </span>
        </div>
        <div className="ex-markets-grid-stat ex-markets-grid-stat--desktop">
          <span className="ex-markets-grid-stat-label">Open int.</span>
          <span className="ex-markets-grid-stat-value">
            {formatUsd(market.openInterest)}
          </span>
        </div>
        <div className="ex-markets-grid-stat">
          <span className="ex-markets-grid-stat-label">24h high</span>
          <span className="ex-markets-grid-stat-value">
            {formatPrice(market.high24h)}
          </span>
        </div>
        <div className="ex-markets-grid-stat">
          <span className="ex-markets-grid-stat-label">24h low</span>
          <span className="ex-markets-grid-stat-value">
            {formatPrice(market.low24h)}
          </span>
        </div>
        <div className="ex-markets-grid-stat ex-markets-grid-stat--desktop">
          <span className="ex-markets-grid-stat-label">Funding</span>
          <span
            className={`ex-markets-grid-stat-value${market.fundingRate != null ? (fundingUp ? " is-up" : " is-down") : ""}`}
          >
            {formatFundingRate(market.fundingRate)}
          </span>
        </div>
      </div>
    </Link>
  );
}
