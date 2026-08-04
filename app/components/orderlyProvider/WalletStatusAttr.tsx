import { useEffect } from "react";
import { useAccount } from "@orderly.network/hooks";
import { useAppContext } from "@orderly.network/react-app";
import { AccountStatusEnum } from "@orderly.network/types";

/**
 * Exposes wallet connection readiness on <html> for CSS that should only
 * apply while disconnected (e.g. hide the side Connect-wallet assets panel).
 */
export function WalletStatusAttr() {
  const { state } = useAccount();
  const { disabledConnect } = useAppContext();

  useEffect(() => {
    const disconnected =
      disabledConnect || state.status <= AccountStatusEnum.NotConnected;
    document.documentElement.dataset.idxWalletConnected = disconnected
      ? "false"
      : "true";

    return () => {
      delete document.documentElement.dataset.idxWalletConnected;
    };
  }, [disabledConnect, state.status]);

  return null;
}
