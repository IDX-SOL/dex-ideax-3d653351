import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@orderly.network/hooks";
import { AccountStatusEnum } from "@orderly.network/types";
import {
  fetchCredentialsStatus,
  type CredentialsStatus,
} from "./workerApi";

export function useBotAccess() {
  const { state } = useAccount();
  const walletConnected =
    state.status > AccountStatusEnum.NotConnected;
  const walletReady = state.status >= AccountStatusEnum.EnableTrading;
  const accountId =
    (state as { accountId?: string }).accountId ||
    (state as { userId?: string }).userId ||
    null;

  const [cred, setCred] = useState<CredentialsStatus | null>(null);

  const refreshCred = useCallback(async () => {
    try {
      const st = await fetchCredentialsStatus();
      setCred(st);
    } catch {
      setCred(null);
    }
  }, []);

  useEffect(() => {
    void refreshCred();
    const id = window.setInterval(() => void refreshCred(), 15000);
    return () => window.clearInterval(id);
  }, [refreshCred]);

  const accountMismatch =
    !!walletReady &&
    !!accountId &&
    !!cred?.account_id &&
    cred.source === "store" &&
    cred.account_id !== accountId;

  // Local dogfood: .env keys → show UI without wallet (Cursor browser, etc.)
  const localEnvDogfood = cred?.source === "env" && !!cred.connected;
  // While credentials status is loading (cred === null), keep UI open
  const canView =
    walletConnected || localEnvDogfood || cred === null;

  return {
    walletConnected,
    walletReady,
    accountId,
    cred,
    refreshCred,
    accountMismatch,
    canView,
    canManage: canView,
    localEnvDogfood,
  };
}
