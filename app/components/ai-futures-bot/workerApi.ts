import { getRuntimeConfig } from "@/utils/runtime-config";

export type EngineBot = {
  id: string;
  symbol: string;
  label: string;
  leverage: number;
  mode: "live" | string;
  status: "stopped" | "running" | "paused_kill";
  today_pnl: number;
  kill_until: number;
  position: {
    side: "long" | "short" | null;
    qty: number;
    avg_entry: number;
    legs: number;
    opened_at: number | null;
    unrealized_pnl: number;
    margin_mode?: string | null;
    leverage?: number | null;
    tp_price?: number;
    sl_price?: number;
    /** Orderly-style isolated risk rate % for this bot position (0 when flat). */
    risk_rate_pct?: number;
  };
  market_thought: string;
  risk_thought: string;
  boss_thought: string;
  boss_action: string;
  logs: string[];
  price: number;
  mean_m: number;
  atr: number;
  /** 30d median daily true range (D) */
  daily_tr_med?: number;
  /** Stretch in multiples of D (not 15m ATR) */
  stretch_atr: number;
  stretch: number;
  side_bias: "long" | "short" | null;
  available_usdc: number;
  /** Engine 15m window — sole chart source when worker is online */
  chart_candles?: EngineCandle[];
};

export type EngineCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  a: number;
};

function baseUrl(): string {
  return (
    getRuntimeConfig("VITE_FUTURES_BOT_API") ||
    "http://127.0.0.1:8787"
  ).replace(/\/$/, "");
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || j.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function fetchHealth() {
  return req<{ ok: boolean; engine_online: boolean; has_keys: boolean }>(
    "/health",
  );
}

export async function fetchAccount() {
  return req<{ available_usdc: number }>("/v1/account");
}

/** Worker stretch-fade constants — chart must use these when online. */
export type StrategyConfig = {
  stretch_entry_d: number;
  stretch_add_d: number;
  stretch_exit_d: number;
  stretch_sl_d: number;
  stretch_full_d: number;
  stretch_min_fill_d: number;
  min_net_tp_pct: number;
  max_tp_overshoot_d: number;
  trend_lookback_bars: number;
  trend_move_d: number;
  window_bars: number;
  limit_entry_wait_seconds: number;
  loss_streak_pause_n: number;
  loss_streak_cooldown_hours: number;
  idx_taker_fee_rate: number;
  idx_maker_fee_rate: number;
  idx_round_trip_fee_rate: number;
};

export async function fetchStrategyConfig() {
  return req<StrategyConfig>("/v1/strategy/config");
}

export async function fetchBots() {
  return req<{ bots: EngineBot[]; engine_online: boolean }>("/v1/bots");
}

export async function fetchBot(id: string) {
  return req<{ bot: EngineBot; engine_online: boolean }>(`/v1/bots/${id}`);
}

export async function addBot(symbol: string, leverage: number, mode: string) {
  return req<{ bot: EngineBot }>("/v1/bots", {
    method: "POST",
    body: JSON.stringify({ symbol, leverage, mode }),
  });
}

export async function startBot(id: string) {
  return req<{ bot: EngineBot }>(`/v1/bots/${id}/start`, { method: "POST" });
}

export async function stopBot(id: string) {
  return req<{ bot: EngineBot }>(`/v1/bots/${id}/stop`, { method: "POST" });
}

export async function deleteBot(id: string) {
  return req<{ ok: boolean }>(`/v1/bots/${id}`, { method: "DELETE" });
}

export async function setBotLeverage(id: string, leverage: number) {
  return req<{ bot: EngineBot }>(`/v1/bots/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ leverage }),
  });
}

export type NeuralLogRow = {
  ts: number;
  line: string;
};

export async function fetchBotLogs(id: string, limit = 200) {
  return req<{ bot_id: string; logs: NeuralLogRow[]; limit: number }>(
    `/v1/bots/${id}/logs?limit=${limit}`,
  );
}

export type CredentialsStatus = {
  connected: boolean;
  source: "store" | "env" | "none";
  account_id: string | null;
  expires_at: number | null;
  days_left: number | null;
  renew: "ok" | "soft" | "strong" | "expired" | "missing";
  message: string | null;
  testnet: boolean;
};

export async function fetchCredentialsStatus() {
  return req<CredentialsStatus>("/v1/credentials");
}

export async function saveCredentials(body: {
  account_id: string;
  key: string;
  secret: string;
  expires_at?: number | null;
}) {
  return req<{ ok: boolean } & CredentialsStatus>("/v1/credentials", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function disconnectCredentials() {
  return req<{ ok: boolean } & CredentialsStatus>("/v1/credentials", {
    method: "DELETE",
  });
}
