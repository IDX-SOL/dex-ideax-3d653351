import type { ConfigProviderProps } from "@orderly.network/hooks";
import type { API } from "@orderly.network/types";
import { getRuntimeConfigArray } from "./runtime-config";

const PINNED_SYMBOL = "PERP_SOL_USDC";

function sortWithSolFirst(symbols: API.MarketInfoExt[]): API.MarketInfoExt[] {
  return [...symbols].sort((a, b) => {
    if (a.symbol === PINNED_SYMBOL) return -1;
    if (b.symbol === PINNED_SYMBOL) return 1;
    return (b["24h_volume"] ?? 0) - (a["24h_volume"] ?? 0);
  });
}

/**
 * Create a dataAdapter with symbolList function for filtering symbols
 * based on runtime configuration.
 *
 * Format: Comma-separated list of full symbol names (e.g., "PERP_BTC_USDC,PERP_ETH_USDC")
 * - Only symbols in the list will be included
 * - If empty, all symbols are returned
 * - PERP_SOL_USDC is always pinned first; remaining symbols sort by 24h volume
 */
export function createSymbolDataAdapter(): NonNullable<
  ConfigProviderProps["dataAdapter"]
> {
  const symbolList = getRuntimeConfigArray("VITE_SYMBOL_LIST");

  return {
    symbolList: (original: API.MarketInfoExt[]) => {
      const filtered =
        symbolList.length === 0
          ? original
          : original.filter((item) => symbolList.includes(item.symbol));

      return sortWithSolFirst(filtered);
    },
  };
}
