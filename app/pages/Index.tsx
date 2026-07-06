import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { TradingPage } from "@orderly.network/trading";
import { API } from "@orderly.network/types";
import { useOrderlyConfig } from "@/utils/config";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { getSymbol, updateSymbol } from "@/utils/storage";
import { formatSymbol, generatePageTitle } from "@/utils/utils";

export default function Index() {
  const [symbol, setSymbol] = useState(getSymbol);
  const config = useOrderlyConfig();

  useEffect(() => {
    updateSymbol(symbol);
  }, [symbol]);

  const onSymbolChange = useCallback((data: API.Symbol) => {
    setSymbol(data.symbol);
    updateSymbol(data.symbol);
  }, []);

  const pageMeta = getPageMeta();
  const appName = getRuntimeConfig("VITE_APP_NAME");
  const appDescription = getRuntimeConfig("VITE_APP_DESCRIPTION");
  const pageTitle = generatePageTitle(formatSymbol(symbol));

  return (
    <div className="h-full">
      {renderSEOTags(pageMeta, pageTitle)}
      {appDescription && (
        <Helmet>
          <meta name="description" content={appDescription} />
        </Helmet>
      )}
      <TradingPage
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        tradingViewConfig={config.tradingPage.tradingViewConfig}
        sharePnLConfig={config.tradingPage.sharePnLConfig}
      />
      <div className="md:hidden pb-2 pt-8 text-center">
        <span className="oui-text-2xs oui-text-base-contrast-54">
          Charts powered by{" "}
          <a
            href="https://tradingview.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            TradingView
          </a>
        </span>
      </div>
    </div>
  );
}
