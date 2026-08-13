import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Plus, RefreshCw, Square, Trash2, X } from "lucide-react";
import {
  AI_FUTURES_BOT_MARKETS,
  AI_FUTURES_BOT_MENU_NAME,
  AI_FUTURES_BOT_PATH,
} from "./constants";
import {
  addBot,
  deleteBot,
  fetchAccount,
  fetchBots,
  startBot,
  stopBot,
  type EngineBot,
} from "./workerApi";
import { useBotAccess } from "./useBotAccess";
import {
  DEFAULT_LEVERAGE,
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  formatLevRiskHint,
  estimateFullIdeaSlPct,
} from "./leverageRisk";
import "./ai-futures-bot.css";

function statusLabel(b: EngineBot) {
  if (b.status === "running") {
    return b.position.qty > 0 ? "In position" : "Waiting";
  }
  if (b.status === "paused_kill") return "Paused";
  return "Stopped";
}

export default function BotsList() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<EngineBot[]>([]);
  const [available, setAvailable] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [stopTarget, setStopTarget] = useState<EngineBot | null>(null);
  const [symbol, setSymbol] = useState(AI_FUTURES_BOT_MARKETS[0].id);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const { canView, cred } = useBotAccess();

  const refresh = useCallback(async () => {
    try {
      const [list, acct] = await Promise.all([fetchBots(), fetchAccount()]);
      setBots(list.bots);
      setOnline(list.engine_online);
      setAvailable(acct.available_usdc);
      setError(null);
    } catch (e) {
      setOnline(false);
      setError(e instanceof Error ? e.message : "Engine offline");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const usedSymbols = new Set(bots.map((b) => b.symbol));
  const freeMarkets = AI_FUTURES_BOT_MARKETS.filter((m) => !usedSymbols.has(m.id));

  const onAdd = async () => {
    setBusy(true);
    try {
      await addBot(symbol, leverage, "live");
      setAddOpen(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (b: EngineBot) => {
    if (b.status === "running" || b.status === "paused_kill") {
      setStopTarget(b);
      return;
    }
    setBusy(true);
    try {
      await startBot(b.id);
      navigate(`${AI_FUTURES_BOT_PATH}/${b.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = async () => {
    if (!stopTarget) return;
    const b = stopTarget;
    setStopTarget(null);
    setBusy(true);
    try {
      await stopBot(b.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (b: EngineBot) => {
    if (b.status !== "stopped") {
      setError("Stop the bot before deleting");
      return;
    }
    if (!window.confirm(`Delete ${b.label}?`)) return;
    setBusy(true);
    try {
      await deleteBot(b.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!canView) {
    return (
      <div className="afb-root">
        <div className="afb-atmosphere" aria-hidden />
        <div className="afb-content mx-auto max-w-6xl px-4 py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--afb-teal)]">
            Stretch fade
          </p>
          <h1 className="afb-display mt-1 text-3xl font-extrabold tracking-tight text-[var(--afb-text)]">
            {AI_FUTURES_BOT_MENU_NAME}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--afb-muted)]">
            Connect your wallet to view and manage bots. Running bots keep
            trading when you disconnect — reconnect to see them again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="afb-root">
      <div className="afb-atmosphere" aria-hidden />
      <div className="afb-content mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--afb-teal)]">
              Stretch fade
            </p>
            <h1 className="afb-display mt-1 text-3xl font-extrabold tracking-tight text-[var(--afb-text)] sm:text-4xl">
              {AI_FUTURES_BOT_MENU_NAME}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--afb-muted)]">
              Three agents scan stretch, gate risk, and fade back to mean on IDX
              perps.
            </p>
            {cred?.renew === "soft" ||
            cred?.renew === "strong" ||
            cred?.renew === "expired" ||
            cred?.renew === "missing" ? (
              <p className="mt-3 text-xs text-[var(--afb-amber)]">
                {cred.message ||
                  "Renew trading access — create a new API key from your dashboard."}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-xl border border-[var(--afb-line)] bg-black/30 px-3 py-2 text-xs text-[var(--afb-muted)]">
              Available{" "}
              <span className="tabular-nums text-[var(--afb-text)]">
                {available == null ? "—" : `$${available.toFixed(2)}`}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--afb-line)] text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!freeMarkets.length || busy}
              onClick={() => {
                if (freeMarkets[0]) setSymbol(freeMarkets[0].id);
                setAddOpen(true);
              }}
              className="afb-display inline-flex items-center gap-2 rounded-xl bg-[var(--afb-teal)] px-4 py-2 text-xs font-bold text-[#04120f] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add bot
            </button>
          </div>
        </header>

        {!online || error ? (
          <p className="mt-4 rounded-xl border border-[var(--afb-rose)]/40 bg-[rgba(240,113,120,0.08)] px-4 py-3 text-sm text-[var(--afb-rose)]">
            Engine offline — start the worker (`scripts/run_worker.py`).{" "}
            {error ? `(${error})` : null}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {bots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--afb-line)] px-6 py-12 text-center">
              <p className="afb-display text-lg font-semibold text-[var(--afb-text)]">
                No bots yet
              </p>
              <p className="mt-2 text-sm text-[var(--afb-muted)]">
                Add SOL, ETH, or BTC — one bot per perp (max 3).
              </p>
            </div>
          ) : (
            bots.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--afb-line)] bg-black/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  to={`${AI_FUTURES_BOT_PATH}/${b.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="afb-display text-lg font-bold text-[var(--afb-text)]">
                    {b.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--afb-muted)]">
                    {statusLabel(b)} · {b.leverage}× · live
                    {b.position.qty > 0
                      ? ` · open ${b.position.unrealized_pnl >= 0 ? "+" : ""}$${b.position.unrealized_pnl.toFixed(2)}`
                      : ""}
                  </p>
                  <p
                    className={`mt-1 text-sm tabular-nums ${
                      b.today_pnl > 0
                        ? "text-[var(--afb-teal)]"
                        : "text-[var(--afb-text)]"
                    }`}
                  >
                    Today {b.today_pnl >= 0 ? "+" : ""}${b.today_pnl.toFixed(2)}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  {b.status === "stopped" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(b)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--afb-line)] text-[var(--afb-muted)] hover:border-[var(--afb-rose)]/50 hover:text-[var(--afb-rose)]"
                      aria-label={`Delete ${b.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onToggle(b)}
                    className={`afb-display inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                      b.status === "running" || b.status === "paused_kill"
                        ? "bg-white/10 text-[var(--afb-text)] ring-1 ring-[var(--afb-line)]"
                        : "bg-[var(--afb-teal)] text-[#04120f]"
                    }`}
                  >
                    {b.status === "running" || b.status === "paused_kill" ? (
                      <>
                        <Square className="h-3 w-3 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Start
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {stopTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cancel stop"
            onClick={() => setStopTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="afb-display text-lg font-bold">
                Stop {stopTarget.label}?
              </h2>
              <button
                type="button"
                onClick={() => setStopTarget(null)}
                className="rounded-lg p-1.5 text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-[var(--afb-muted)]">
              This stops the bot and{" "}
              <span className="text-[var(--afb-text)]">
                closes all positions and open orders
              </span>{" "}
              for this perp.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setStopTarget(null)}
                className="afb-display flex-1 rounded-xl py-3 text-sm font-bold text-[var(--afb-text)] ring-1 ring-[var(--afb-line)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmStop()}
                className="afb-display flex-1 rounded-xl bg-[var(--afb-rose)] py-3 text-sm font-bold text-[#1a080a] disabled:opacity-40"
              >
                Stop & close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <h2 className="afb-display text-lg font-bold">Add bot</h2>
            <label className="mt-4 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
              Symbol
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--afb-line)] bg-black/40 px-3 py-2 text-sm text-[var(--afb-text)]"
              >
                {freeMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
              Leverage {leverage}× (max {MAX_LEVERAGE}×)
              <input
                type="range"
                min={MIN_LEVERAGE}
                max={MAX_LEVERAGE}
                step={1}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--afb-teal)]"
              />
            </label>
            <p className="mt-2 text-xs leading-relaxed text-[var(--afb-text)]">
              {formatLevRiskHint(
                leverage,
                estimateFullIdeaSlPct({
                  leverage,
                  availableUsdc: available,
                }),
              )}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
              Default {DEFAULT_LEVERAGE}×. Higher leverage is optional risk.
              Match the worker to the exchange network (testnet / mainnet).
            </p>
            <button
              type="button"
              disabled={busy || !freeMarkets.length}
              onClick={() => void onAdd()}
              className="afb-display mt-5 w-full rounded-xl bg-[var(--afb-teal)] py-3 text-sm font-bold text-[#04120f]"
            >
              Create bot
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
