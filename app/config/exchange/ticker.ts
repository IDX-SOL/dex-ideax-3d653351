import { withBasePath } from "@/utils/base-path";

export const TICKER = [
  "BTC",
  "ETH",
  "SOL",
  "XAU",
  "TSLA",
  "GOOGL",
  "AAPL",
  "NAS100",
  "NVDA",
  "XAG",
  "CL",
  "EURUSD",
  "DOGE",
  "WIF",
] as const;

export const TICKER_SYMBOLS: Record<string, string> = {
  BTC: "PERP_BTC_USDC",
  ETH: "PERP_ETH_USDC",
  SOL: "PERP_SOL_USDC",
  XAU: "PERP_XAU_USDC",
  TSLA: "PERP_TSLA_USDC",
  GOOGL: "PERP_GOOGL_USDC",
  AAPL: "PERP_AAPL_USDC",
  NAS100: "PERP_NAS100_USDC",
  NVDA: "PERP_NVDA_USDC",
  XAG: "PERP_XAG_USDC",
  CL: "PERP_CL_USDC",
  EURUSD: "PERP_EURUSD_USDC",
  DOGE: "PERP_DOGE_USDC",
  WIF: "PERP_WIF_USDC",
};

export function tickerIcon(id: string) {
  return withBasePath(`/exchange-home/tickers/${id}.png`);
}

export function tickerIconWebp(id: string) {
  return withBasePath(`/exchange-home/tickers/${id}.webp`);
}
