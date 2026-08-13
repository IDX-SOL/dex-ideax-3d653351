/** AI Futures Bot — public labels + internal ids for support / engine wiring. */

export const AI_FUTURES_BOT_PRODUCT_ID = "idx-futures-bot";
export const AI_FUTURES_BOT_STRATEGY_ID = "stretch-fade";
export const AI_FUTURES_BOT_PATH = "/ai-futures-bot";
export const AI_FUTURES_BOT_MENU_NAME = "AI Futures Bot";
export const AI_FUTURES_BOT_SEO_NAME = "IDX AI Futures Trading Bot";

export type AiFuturesBotMarket = {
  id: string;
  symbol: string;
  label: string;
  basePrice: number;
};

/** Orderly-style perp markets (any coin the user chooses). */
export const AI_FUTURES_BOT_MARKETS: AiFuturesBotMarket[] = [
  {
    id: "PERP_SOL_USDC",
    symbol: "SOL",
    label: "SOL-PERP",
    basePrice: 148.2,
  },
  {
    id: "PERP_ETH_USDC",
    symbol: "ETH",
    label: "ETH-PERP",
    basePrice: 3420,
  },
  {
    id: "PERP_BTC_USDC",
    symbol: "BTC",
    label: "BTC-PERP",
    basePrice: 94500,
  },
];
