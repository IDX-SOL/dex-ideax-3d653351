import { TICKER, TICKER_SYMBOLS } from "@/config/exchange/ticker";
import {
  ORDERLY_FUTURES_URL,
  ORDERLY_INFO_URL,
  ORDERLY_RWA_INFO_URL,
  buildMarketsList,
  buildNewListingsTable,
  fetchOrderlyJson,
  toNumber,
  topGainers,
} from "@/lib/exchange/orderlyMarkets";

const BALANCE_URL = "https://api.orderly.org/v1/public/balance/stats";
const FNG_URL = "https://api.alternative.me/fng/?limit=1";
const LONG_SHORT_URL =
  "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1";

function pickRow(rows: Record<string, unknown>[], id: string) {
  const want = TICKER_SYMBOLS[id];
  return (
    rows.find((row) => row.symbol === want) ||
    rows.find((row) => String(row.symbol || "").startsWith(`PERP_${id}_`))
  );
}

export async function fetchTickerQuotes() {
  try {
    const body = await fetchOrderlyJson(ORDERLY_FUTURES_URL);
    const rows = body?.data?.rows;
    if (!Array.isArray(rows)) return { items: [] };

    const items = TICKER.map((id) => {
      const row = pickRow(rows, id);
      const price = toNumber(row?.mark_price) || toNumber(row?.index_price);
      const open = toNumber(row?.["24h_open"]);
      const changePct =
        open > 0 && price > 0 ? ((price - open) / open) * 100 : null;
      return {
        id,
        price: price > 0 ? price : null,
        changePct,
      };
    });

    return { items };
  } catch {
    return { items: [] };
  }
}

export async function fetchMarketsSnapshot() {
  try {
    const [futuresBody, balanceBody, fngBody, lsBody] = await Promise.all([
      fetchOrderlyJson(ORDERLY_FUTURES_URL),
      fetchOrderlyJson(BALANCE_URL),
      fetchOrderlyJson(FNG_URL),
      fetchOrderlyJson(LONG_SHORT_URL),
    ]);

    const rows = futuresBody?.data?.rows;
    let volume24h: number | null = null;
    let openInterest: number | null = null;
    if (Array.isArray(rows)) {
      volume24h = rows.reduce(
        (sum: number, row: Record<string, unknown>) =>
          sum + toNumber(row["24h_amount"]),
        0,
      );
      openInterest = rows.reduce(
        (sum: number, row: Record<string, unknown>) =>
          sum + toNumber(row.open_interest),
        0,
      );
    }

    const tvl = toNumber(balanceBody?.data?.total_holding) || null;

    const fngRow = fngBody?.data?.[0];
    const fearGreed = fngRow
      ? {
          value: toNumber(fngRow.value),
          label: String(fngRow.value_classification || ""),
        }
      : null;

    const lsRow = Array.isArray(lsBody) ? lsBody[0] : null;
    const longPct = lsRow ? toNumber(lsRow.longAccount) * 100 : null;
    const longShort =
      longPct != null
        ? {
            longPct,
            shortPct: 100 - longPct,
          }
        : null;

    const gainers = topGainers(rows);

    return { volume24h, openInterest, tvl, fearGreed, longShort, gainers };
  } catch {
    return {
      volume24h: null,
      openInterest: null,
      tvl: null,
      fearGreed: null,
      longShort: null,
      gainers: [],
    };
  }
}

export async function fetchMarketsGrid() {
  try {
    const [futuresBody, rwaBody] = await Promise.all([
      fetchOrderlyJson(ORDERLY_FUTURES_URL),
      fetchOrderlyJson(ORDERLY_RWA_INFO_URL),
    ]);

    const markets = buildMarketsList(
      futuresBody?.data?.rows,
      rwaBody?.data?.rows,
    );

    return { markets };
  } catch {
    return { markets: [] };
  }
}

export async function fetchNewListings() {
  try {
    const [futuresBody, infoBody] = await Promise.all([
      fetchOrderlyJson(ORDERLY_FUTURES_URL),
      fetchOrderlyJson(ORDERLY_INFO_URL),
    ]);

    const listings = buildNewListingsTable(
      futuresBody?.data?.rows,
      infoBody?.data?.rows,
    );

    return { listings };
  } catch {
    return { listings: [] };
  }
}
