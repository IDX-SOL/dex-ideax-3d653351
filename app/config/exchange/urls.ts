export const SITE_URL = "https://idxsolana.io";
export const TOOLS_SITE_URL = "https://tools.idxsolana.io";
export const DOCS_URL = "https://docs.idxsolana.io";
export const DOCS_EXCHANGE_URL = `${DOCS_URL}/idx-exchange`;
export const DOCS_EXCHANGE_API_URL = `${DOCS_URL}/idx-exchange/api`;
export const LAUNCHLAB_URL = `${SITE_URL}/idx-launchlab`;
export const GUIDE_URL = `${SITE_URL}/exchange/learn-more`;

export const FUTURES_URL = "/futures";
export const SWAP_URL = "/swap";
export const MARKETS_URL = "/markets";
export const AFFILIATE_URL = "/rewards/affiliate";
export const API_KEYS_URL = "/portfolio/api-key";
export const BOT_URL = "/ai-futures-bot";

export function tradeUrl(symbol: string) {
  return `${FUTURES_URL}?symbol=${encodeURIComponent(symbol)}`;
}

export const SOCIAL_X_URL = "https://x.com/IDX__Solana";
export const SOCIAL_DISCORD_URL = "https://discord.com/invite/4mw4GBxj23";
export const SOCIAL_TELEGRAM_URL = "https://t.me/IDX_Solana";
export const SOCIAL_LINKEDIN_URL = "https://www.linkedin.com/company/idx-solana/";
export const SOCIAL_INSTAGRAM_URL = "https://www.instagram.com/idx_solana/";
export const SOCIAL_YOUTUBE_URL = "https://www.youtube.com/@idx-solana";
export const CHANNEL_TOKENS_URL = "https://t.me/IDX_Solana";
export const CHANNEL_NEWS_URL = "https://t.me/IDX_Crypto_News";
