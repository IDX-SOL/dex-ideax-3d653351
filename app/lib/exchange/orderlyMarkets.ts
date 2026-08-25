export const ORDERLY_FUTURES_URL = "https://api.orderly.org/v1/public/futures";
export const ORDERLY_INFO_URL = "https://api.orderly.org/v1/public/info";
export const ORDERLY_RWA_INFO_URL = "https://api.orderly.org/v1/public/rwa/info";

const NEW_LISTING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function displaySymbol(row: {
  display_symbol_name?: string;
  symbol?: string;
}) {
  if (row.display_symbol_name) return String(row.display_symbol_name);
  const symbol = String(row.symbol || "");
  return symbol.replace(/^PERP_/, "").replace(/_USDC$/, "") || symbol;
}

/** Base asset for Orderly CDN logos — same as TokenIcon (PERP_BTC_USDC → BTC). */
export function iconSymbolFromSymbol(symbol: string) {
  const parts = String(symbol || "").split("_");
  if (parts.length >= 2) return parts[1];
  return String(symbol || "");
}

export function changePctFromRow(row: Record<string, unknown>) {
  const open = toNumber(row["24h_open"]);
  const close = toNumber(row["24h_close"]);
  if (!(open > 0) || !(close > 0)) return null;
  return ((close - open) / open) * 100;
}

export function isCommunityMarket(row: { broker_id?: string }) {
  const brokerId = row?.broker_id;
  return typeof brokerId === "string" && brokerId.length > 0;
}

export function normalizeMarketRow(
  row: Record<string, unknown>,
  rwaSymbols: Set<string>,
) {
  const symbol = String(row.symbol || "");
  if (!symbol || isCommunityMarket(row as { broker_id?: string })) return null;

  const price =
    toNumber(row["24h_close"]) ||
    toNumber(row.mark_price) ||
    toNumber(row.index_price);
  const volume24h = toNumber(row["24h_amount"]);
  const pct = changePctFromRow(row);
  if (!(price > 0) || pct == null) return null;

  const markPrice = toNumber(row.mark_price) || price;
  const indexPrice = toNumber(row.index_price) || markPrice;
  const openInterest = getOpenInterestUsd(row.open_interest, indexPrice);
  const fundingRate =
    toNumber(row.est_funding_rate) || toNumber(row.last_funding_rate) || null;

  return {
    symbol,
    displaySymbol: displaySymbol(row as { display_symbol_name?: string; symbol?: string }),
    iconSymbol: iconSymbolFromSymbol(symbol),
    price,
    open24h: toNumber(row["24h_open"]),
    high24h: toNumber(row["24h_high"]),
    low24h: toNumber(row["24h_low"]),
    volume24h,
    openInterest,
    fundingRate,
    changePct: pct,
    isTradFi: rwaSymbols.has(symbol),
  };
}

export function buildMarketsList(
  futuresRows: Record<string, unknown>[] | undefined,
  rwaRows: { symbol?: string }[] | undefined,
) {
  const rwaSymbols = new Set(
    Array.isArray(rwaRows)
      ? rwaRows.map((row) => String(row.symbol || "")).filter(Boolean)
      : [],
  );

  if (!Array.isArray(futuresRows)) return [];

  return futuresRows
    .map((row) => normalizeMarketRow(row, rwaSymbols))
    .filter(Boolean)
    .sort((a, b) => b!.volume24h - a!.volume24h);
}

export function isNewListing(createdTime: unknown) {
  const t = toNumber(createdTime);
  if (!(t > 0)) return false;
  return Date.now() - t < NEW_LISTING_WINDOW_MS;
}

export function getLeverage(baseImr: unknown) {
  const imr = toNumber(baseImr);
  if (!(imr > 0)) return null;
  return Math.round(1 / imr);
}

export function get8hFunding(estRate: unknown, fundingPeriod: unknown) {
  const rate = toNumber(estRate);
  const period = toNumber(fundingPeriod);
  if (!Number.isFinite(rate) || !(period > 0)) return null;
  return (rate * period) / 8;
}

export function getOpenInterestUsd(openInterest: unknown, indexPrice: unknown) {
  return toNumber(openInterest) * toNumber(indexPrice);
}

function infoMapFromRows(infoRows: Record<string, unknown>[] | undefined) {
  const map = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(infoRows)) return map;
  for (const row of infoRows) {
    const symbol = String(row.symbol || "");
    if (symbol) map.set(symbol, row);
  }
  return map;
}

function normalizeNewListingRow(
  futuresRow: Record<string, unknown>,
  infoRow: Record<string, unknown> | undefined,
) {
  const symbol = String(futuresRow.symbol || "");
  if (!symbol) return null;

  const createdTime = toNumber(infoRow?.created_time);
  if (!isNewListing(createdTime)) return null;

  const volume24h = toNumber(futuresRow["24h_amount"]);
  if (!(volume24h > 0)) return null;

  const price =
    toNumber(futuresRow["24h_close"]) ||
    toNumber(futuresRow.mark_price) ||
    toNumber(futuresRow.index_price);
  if (!(price > 0)) return null;

  const open = toNumber(futuresRow["24h_open"]);
  let changePct = changePctFromRow(futuresRow);
  if (changePct == null && open > 0) {
    changePct = ((price - open) / open) * 100;
  }
  if (changePct == null) changePct = 0;

  const indexPrice = toNumber(futuresRow.index_price) || price;

  return {
    symbol,
    displaySymbol: displaySymbol(futuresRow as { display_symbol_name?: string; symbol?: string }),
    iconSymbol: iconSymbolFromSymbol(symbol),
    leverage: getLeverage(infoRow?.base_imr),
    price,
    changePct,
    volume24h,
    openInterest: getOpenInterestUsd(futuresRow.open_interest, indexPrice),
    funding8h: get8hFunding(
      futuresRow.est_funding_rate ?? futuresRow.last_funding_rate,
      infoRow?.funding_period,
    ),
    createdTime,
  };
}

export function buildNewListingsTable(
  futuresRows: Record<string, unknown>[] | undefined,
  infoRows: Record<string, unknown>[] | undefined,
) {
  const infoMap = infoMapFromRows(infoRows);
  if (!Array.isArray(futuresRows)) return [];

  return futuresRows
    .map((row) => normalizeNewListingRow(row, infoMap.get(String(row.symbol || ""))))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => b.createdTime - a.createdTime)
    .map(({ createdTime: _createdTime, ...listing }) => listing);
}

export function topGainers(rows: Record<string, unknown>[] | undefined) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const pct = changePctFromRow(row);
      const price = toNumber(row["24h_close"]);
      if (pct == null || !(price > 0)) return null;
      return {
        symbol: String(row.symbol || ""),
        displaySymbol: displaySymbol(row as { display_symbol_name?: string; symbol?: string }),
        iconSymbol: iconSymbolFromSymbol(String(row.symbol || "")),
        price,
        changePct: pct,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.changePct - a!.changePct)
    .slice(0, 5);
}

export async function fetchOrderlyJson(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}
