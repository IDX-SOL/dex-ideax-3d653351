import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useWalletConnector } from "@orderly.network/hooks";
import { useAppContext } from "@orderly.network/react-app";
import { WooFiSwapWidget } from "woofi-swap-widget-kit";
import { getRuntimeConfig } from "../utils/runtime-config";
import { triggerHeaderConnect } from "../utils/triggerHeaderConnect";

import "woofi-swap-widget-kit/style.css";
import "../styles/woofi-widget.css";

/** WooFi localStorage key — when "false", chart stays hidden on remount. */
const CHART_VISIBLE_KEY = "LOCAL_STORAGE_KEY_USER_EXPANDED_DEX";

type VueLike = {
  isChartVisible?: boolean;
  $children?: VueLike[];
};

function dispatchResize() {
  window.dispatchEvent(new Event("resize"));
}

function setChartVisiblePreference(visible: boolean) {
  try {
    localStorage.setItem(CHART_VISIBLE_KEY, visible ? "true" : "false");
  } catch {
    /* ignore storage errors */
  }
}

/** WooFi hides the chart on viewports <1000px and writes "false" to localStorage. */
function forceSwapChartVisible(widget: WooFiSwapWidget | null): boolean {
  const root = widget?.vm as VueLike | null;
  if (!root) return false;

  const stack: VueLike[] = [root];
  while (stack.length > 0) {
    const vm = stack.pop();
    if (!vm) continue;
    if (typeof vm.isChartVisible === "boolean") {
      vm.isChartVisible = true;
      setChartVisiblePreference(true);
      return true;
    }
    for (const child of vm.$children ?? []) {
      stack.push(child);
    }
  }
  return false;
}

function scheduleChartRefresh(widget: WooFiSwapWidget | null) {
  forceSwapChartVisible(widget);
  dispatchResize();
}

export default function WooFiWidget() {
  const { key: routeKey } = useLocation();
  const mountRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<WooFiSwapWidget | null>(null);
  const { wallet, setChain, connectedChain } = useWalletConnector();
  const { connectWallet } = useAppContext();
  const connectWalletRef = useRef(connectWallet);
  connectWalletRef.current = connectWallet;
  const brokerAddress = getRuntimeConfig("VITE_BROKER_EOA_ADDRESS") || "";

  const handleConnectWallet = useCallback(() => {
    triggerHeaderConnect(() => connectWalletRef.current());
  }, []);

  const handleChainSwitch = useCallback(
    (targetChain: { chainName: string; chainId?: string; key: string }) => {
      if (targetChain.chainId) {
        setChain({ chainId: Number(targetChain.chainId) });
      }
    },
    [setChain]
  );

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    setChartVisiblePreference(true);
    host.innerHTML = "";
    const mountDiv = document.createElement("div");
    host.appendChild(mountDiv);

    widgetRef.current = new WooFiSwapWidget({
      container: mountDiv,
      brokerAddress,
      onConnectWallet: handleConnectWallet,
      onChainSwitch: handleChainSwitch,
      currentChain: connectedChain?.id,
      evmProvider: wallet?.provider,
      config: {
        enableLinea: false,
        enableMerlin: false,
        enableHyperevm: false,
        enableZksync: false,
        initialLineChartVisible: true,
      },
    });

    const refreshTimers = [
      window.setTimeout(() => scheduleChartRefresh(widgetRef.current), 0),
      window.setTimeout(() => scheduleChartRefresh(widgetRef.current), 150),
      window.setTimeout(() => scheduleChartRefresh(widgetRef.current), 500),
      window.setTimeout(() => scheduleChartRefresh(widgetRef.current), 1200),
    ];

    const resizeHost = mountRef.current;
    const ro =
      resizeHost &&
      new ResizeObserver(() => {
        scheduleChartRefresh(widgetRef.current);
      });
    if (resizeHost && ro) ro.observe(resizeHost);

    return () => {
      ro?.disconnect();
      for (const id of refreshTimers) window.clearTimeout(id);
      setChartVisiblePreference(true);
      widgetRef.current?.destroy?.();
      widgetRef.current = null;
      host.innerHTML = "";
    };
  }, [routeKey, brokerAddress, handleConnectWallet, handleChainSwitch]);

  useEffect(() => {
    widgetRef.current?.updateEvmProvider(wallet?.provider);
  }, [wallet?.provider]);

  useEffect(() => {
    if (connectedChain?.id) {
      widgetRef.current?.updateCurrentChain(connectedChain.id);
    }
  }, [connectedChain?.id]);

  return (
    <div ref={mountRef} className="idx-woofi-widget-root w-full min-w-0" />
  );
}
