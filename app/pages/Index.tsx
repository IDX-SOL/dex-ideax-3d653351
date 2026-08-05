import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { TradingPage } from "@orderly.network/trading";
import { API } from "@orderly.network/types";
import { MobileDepositWithdrawConnectGate } from "@/components/MobileDepositWithdrawConnectGate";
import { MobileSymbolBarPrice } from "@/components/MobileSymbolBarPrice";
import { OrderBookFoldToggle } from "@/components/OrderBookFoldToggle";
import { OrderEntryFeeAmounts } from "@/components/OrderEntryFeeAmounts";
import { useTradingMode } from "@/hooks/useTradingMode";
import { useOrderlyConfig } from "@/utils/config";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { getSymbol, updateSymbol } from "@/utils/storage";
import { formatSymbol, generatePageTitle } from "@/utils/utils";

/** Lite mobile hides Chart/Trades/Data tabs — pin Chart so content stays on the chart. */
function useLiteMobileForceChartTab(isLite: boolean) {
  useEffect(() => {
    if (!isLite) return;
    const clickChart = () => {
      const chartTab = document.querySelector<HTMLElement>(
        '.oui-trading-topTab [role="tab"][id$="-trigger-chart"]',
      );
      if (chartTab && chartTab.getAttribute("data-state") !== "active") {
        chartTab.click();
      }
    };
    clickChart();
    const id = window.setTimeout(clickChart, 0);
    return () => window.clearTimeout(id);
  }, [isLite]);
}

const LITE_HIDDEN_DATA_LIST_TAB_SUFFIXES = [
  "-trigger-TP/SL",
  "-trigger-Liquidation",
  "-trigger-Assets",
] as const;

/** If Lite hides the active data-list tab, switch to Positions. */
function useLiteForceDataListTab(isLite: boolean) {
  useEffect(() => {
    if (!isLite) return;
    const ensureVisibleTab = () => {
      const active = document.querySelector<HTMLElement>(
        '.oui-trading-dataList-tabs [role="tab"][data-state="active"]',
      );
      if (!active?.id) return;
      const hidden = LITE_HIDDEN_DATA_LIST_TAB_SUFFIXES.some((suffix) =>
        active.id.endsWith(suffix),
      );
      if (!hidden) return;
      const positions =
        document.querySelector<HTMLElement>(
          '.oui-trading-dataList-tabs [role="tab"][id$="-trigger-Positions"]',
        ) ??
        document.querySelector<HTMLElement>(
          '.oui-trading-dataList-tabs [role="tab"][id$="-trigger-Position"]',
        );
      positions?.click();
    };
    ensureVisibleTab();
    const id = window.setTimeout(ensureVisibleTab, 0);
    return () => window.clearTimeout(id);
  }, [isLite]);
}

/** Lite: always show all symbols in data list (control is hidden). */
function useLiteShowAllSymbols(isLite: boolean) {
  useEffect(() => {
    if (!isLite) return;
    try {
      localStorage.setItem("showAllSymbol", JSON.stringify(true));
      window.dispatchEvent(new Event("storage"));
    } catch {
      /* ignore */
    }
  }, [isLite]);
}

export default function Index() {
  const [symbol, setSymbol] = useState(getSymbol);
  const config = useOrderlyConfig();
  const { isLite } = useTradingMode();
  useLiteMobileForceChartTab(isLite);
  useLiteForceDataListTab(isLite);
  useLiteShowAllSymbols(isLite);

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
        key={isLite ? "lite" : "pro"}
        symbol={symbol}
        onSymbolChange={onSymbolChange}
        tradingViewConfig={config.tradingPage.tradingViewConfig}
        sharePnLConfig={config.tradingPage.sharePnLConfig}
      />
      <MobileSymbolBarPrice symbol={symbol} />
      <OrderBookFoldToggle />
      <OrderEntryFeeAmounts symbol={symbol} />
      <MobileDepositWithdrawConnectGate />
    </div>
  );
}
