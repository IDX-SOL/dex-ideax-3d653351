import { useEffect, useState } from "react";
import {
  applyTradingModeToDocument,
  getStoredTradingMode,
  setStoredTradingMode,
  TRADING_MODE_CHANGE_EVENT,
  type TradingMode,
} from "@/utils/trading-mode";

export function useTradingMode() {
  const [mode, setMode] = useState<TradingMode>(() => getStoredTradingMode());

  useEffect(() => {
    applyTradingModeToDocument(mode);
  }, [mode]);

  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<{ mode: TradingMode }>).detail?.mode;
      if (next === "lite" || next === "pro") {
        setMode(next);
      }
    };
    window.addEventListener(TRADING_MODE_CHANGE_EVENT, onChange);
    return () =>
      window.removeEventListener(TRADING_MODE_CHANGE_EVENT, onChange);
  }, []);

  const setTradingMode = (next: TradingMode) => {
    setMode(next);
    setStoredTradingMode(next);
  };

  return {
    mode,
    setTradingMode,
    isLite: mode === "lite",
    isPro: mode === "pro",
  };
}
