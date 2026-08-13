import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Cog,
  ExternalLink,
  Loader2,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  AI_FUTURES_BOT_MARKETS,
  AI_FUTURES_BOT_MENU_NAME,
  AI_FUTURES_BOT_PATH,
  type AiFuturesBotMarket,
} from "./constants";
import IntentChart from "./IntentChart";
import { useMarketSnapshot } from "./market";
import {
  addBot,
  deleteBot,
  disconnectCredentials,
  fetchAccount,
  fetchBot,
  fetchBotLogs,
  fetchBots,
  fetchStrategyConfig,
  saveCredentials,
  setBotLeverage,
  startBot,
  stopBot,
  type EngineBot,
  type NeuralLogRow,
} from "./workerApi";
import { useBotAccess } from "./useBotAccess";
import {
  DEFAULT_LEVERAGE,
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  estimateFullIdeaSlPct,
  formatLevRiskHint,
} from "./leverageRisk";
import {
  DEFAULT_STRETCH_GEOMETRY,
  type StretchGeometry,
} from "./stretchLevels";
import "./ai-futures-bot.css";

const LOG_UI_LIMIT = 200;

function formatPrice(n: number, symbol: string) {
  if (symbol === "BTC") {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (symbol === "ETH") {
    return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function AgentNode({
  name,
  mode,
  thought,
  accent,
}: {
  name: string;
  mode: string;
  thought: string;
  accent: string;
}) {
  const modeColor =
    mode === "Acting"
      ? "text-[var(--afb-amber)]"
      : mode === "Planning"
        ? "text-[var(--afb-teal)]"
        : "text-[var(--afb-muted)]";
  return (
    <div
      className="relative min-w-[240px] max-w-[280px] snap-center rounded-2xl border border-[var(--afb-line)] bg-[rgba(8,12,18,0.72)] px-4 py-3.5 backdrop-blur-md"
      style={{ boxShadow: `0 0 0 1px ${accent}22, 0 12px 40px rgba(0,0,0,0.35)` }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
            aria-hidden
          />
          <span className="afb-display text-[13px] font-semibold tracking-wide text-[var(--afb-text)]">
            {name}
          </span>
        </div>
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.14em] ${modeColor}`}
        >
          {mode}
        </span>
      </div>
      <p className="afb-thought text-[13px] leading-relaxed text-[var(--afb-muted)]">
        {thought}
      </p>
    </div>
  );
}

function MarketPulse({
  market,
  stretch,
  stretchAtr,
  side,
  running,
  price,
  mean,
}: {
  market: AiFuturesBotMarket;
  stretch: number;
  stretchAtr?: number;
  side: "long" | "short" | null;
  running: boolean;
  price: number;
  mean: number;
}) {
  const stretchPct = Math.round(stretch * 100);
  const needleRaw =
    stretch * 40 * (side === "short" ? 1 : side === "long" ? -1 : 0);
  const needle = Math.max(-42, Math.min(42, needleRaw));

  return (
    <div className="relative mx-auto flex h-[280px] w-[280px] items-center justify-center sm:h-[340px] sm:w-[340px]">
      <div
        className={`afb-breathe absolute inset-[8%] rounded-full border border-[var(--afb-line)] ${running ? "afb-running" : ""}`}
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(62,207,186,0.16), rgba(6,8,12,0.2) 55%, transparent 70%)",
          boxShadow: running
            ? "0 0 80px var(--afb-teal-glow), inset 0 0 60px rgba(62,207,186,0.08)"
            : "inset 0 0 40px rgba(62,207,186,0.04)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--afb-muted)]">
          Market pulse · live
        </p>
        <p className="afb-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {market.label}
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--afb-muted)]">
          <span className="text-[var(--afb-text)]">
            ${formatPrice(price, market.symbol)}
          </span>
          <span className="mx-2 opacity-40">·</span>
          M ${formatPrice(mean, market.symbol)}
        </p>
        {stretchAtr != null ? (
          <p className="mt-1 text-[10px] tabular-nums text-[var(--afb-muted)]">
            stretch {stretchAtr.toFixed(2)}× D
          </p>
        ) : null}
        <div className="mt-4 w-40">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--afb-muted)]">
            <span>Stretch</span>
            <span className="tabular-nums text-[var(--afb-teal)]">
              {stretchPct}%
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--afb-teal)]"
              style={{ width: `${Math.max(8, stretchPct)}%` }}
            />
          </div>
          <div className="relative mt-3 h-8 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-[var(--afb-line)]" />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[var(--afb-amber)]"
              style={{ left: `calc(50% + ${needle}%)` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-[var(--afb-muted)]">
            <span
              className={
                side === "long" ? "text-[var(--afb-teal)]" : undefined
              }
            >
              Long
            </span>
            <span>Bias</span>
            <span
              className={
                side === "short" ? "text-[var(--afb-rose)]" : undefined
              }
            >
              Short
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusFromBot(bot: EngineBot) {
  if (bot.status === "paused_kill") return "Paused";
  if (bot.status === "stopped") return "Stopped";
  if (bot.position.qty > 0) return "In position";
  if (bot.boss_action === "ENTER" || bot.boss_action === "ADD") return "Planning";
  return "Waiting";
}

function isTradeBoundaryLog(line: string) {
  return (
    /\bEXIT\b/i.test(line) ||
    /\bBot stopped\b/i.test(line) ||
    /\bflattened\b/i.test(line)
  );
}

/** Real ENTER/ADD fills only — never SCAN ENTER / SCAN ADD. */
function isFillLog(line: string) {
  return /^(?:LIVE\s+)?(?:ENTER|ADD)\s+(long|short)\b/i.test(line.trim());
}

/** Closed-trade EXIT rows only — never SCAN EXIT. */
function isPnlExitLog(line: string) {
  return /^(?:LIVE\s+)?EXIT\b/i.test(line.trim());
}

/** Log tab: main actions only (no SCAN Hold/Manage thinking noise). */
function isMainActionLog(line: string) {
  const t = line.trim();
  if (!t || /^SCAN\b/i.test(t)) return false;
  if (isFillLog(t) || isPnlExitLog(t)) return true;
  if (/^Bad fill\b/i.test(t)) return true;
  if (/^Bot (started|stopped)\b/i.test(t)) return true;
  if (/^Daily kill\b/i.test(t)) return true;
  if (/^Enter failed\b/i.test(t)) return true;
  return false;
}

function isAuxTpSlLog(line: string) {
  if (isFillLog(line) || isTradeBoundaryLog(line)) return false;
  if (/\bTP\/SL\b/i.test(line) || /\bpositional TP\b/i.test(line)) return true;
  return /\bTP\b/.test(line) && /\bSL\b/.test(line);
}

/** Drop worker "LIVE" mode prefix — green › means still-open. */
function displayLogLine(line: string) {
  return line.replace(/^\s*LIVE\s+/i, "");
}

/** SCAN "metrics | thought" → thought only; fills/exits stay full. */
function LogLineBody({ line }: { line: string }) {
  const text = displayLogLine(line);
  if (text.startsWith("SCAN ")) {
    const pipe = text.indexOf(" | ");
    const thought = pipe > 0 ? text.slice(pipe + 3).trim() : text.slice(5).trim();
    return (
      <span className="min-w-0 flex-1 break-words leading-snug">
        {thought || text}
      </span>
    );
  }
  return (
    <span className="min-w-0 flex-1 break-words leading-snug">{text}</span>
  );
}

type PnlHistoryRow = {
  ts: number;
  pnl: number;
  side: "long" | "short" | null;
  qty: number | null;
  price: number | null;
  /** Session mean M at entry (preferred) or exit */
  meanM: number | null;
};

function parseMeanM(line: string): number | null {
  const m = line.match(/\bM\s+([0-9.]+)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePnlHistory(rows: NeuralLogRow[]): PnlHistoryRow[] {
  const out: PnlHistoryRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].line;
    if (!isPnlExitLog(line)) continue;
    const pnlMatch = line.match(/\bpnl=([+-]?\d+(?:\.\d+)?)/i);
    if (!pnlMatch) continue;
    // Prefer fill details on the EXIT line itself (new format)
    const onExit = line.match(
      /\b(long|short)\s+([0-9.]+)\s+@\s+([0-9.]+)/i,
    );
    let side: "long" | "short" | null = onExit
      ? (onExit[1].toLowerCase() as "long" | "short")
      : null;
    let qty: number | null = onExit ? Number(onExit[2]) : null;
    let price: number | null = onExit ? Number(onExit[3]) : null;
    let meanM: number | null = parseMeanM(line);
    // Fallback: hunt real ENTER/ADD between this EXIT and the previous real EXIT
    if (side == null || qty == null || price == null) {
      for (let j = i + 1; j < rows.length; j++) {
        const older = rows[j].line;
        if (isPnlExitLog(older)) break;
        if (!isFillLog(older)) continue;
        const fill = older.match(
          /^(?:LIVE\s+)?(?:ENTER|ADD)\s+(long|short)\s+([0-9.]+)\s+@\s+([0-9.]+)/i,
        );
        if (fill) {
          side = fill[1].toLowerCase() as "long" | "short";
          qty = Number(fill[2]);
          price = Number(fill[3]);
          meanM = parseMeanM(older) ?? meanM;
          break;
        }
      }
    }
    // Fallback for older logs: SCAN … pos=short@76.89×8.01
    if (side == null || qty == null || price == null) {
      for (let j = i; j < Math.min(rows.length, i + 8); j++) {
        const near = rows[j].line;
        if (j > i && isPnlExitLog(near)) break;
        const pos = near.match(
          /\bpos=(long|short)@([0-9.]+)(?:×|x)([0-9.]+)/i,
        );
        if (pos) {
          side = side ?? (pos[1].toLowerCase() as "long" | "short");
          price = price ?? Number(pos[2]);
          qty = qty ?? Number(pos[3]);
          break;
        }
      }
    }
    // Prefer ENTER M if present in the same trade window
    for (let j = i + 1; j < rows.length; j++) {
      const older = rows[j].line;
      if (isPnlExitLog(older)) break;
      if (!/^(?:LIVE\s+)?ENTER\s+/i.test(older.trim())) continue;
      const em = parseMeanM(older);
      if (em != null) {
        meanM = em;
        break;
      }
    }
    out.push({
      ts: rows[i].ts || 0,
      pnl: Number(pnlMatch[1]),
      side,
      qty: qty != null && Number.isFinite(qty) ? qty : null,
      price: price != null && Number.isFinite(price) ? price : null,
      meanM,
    });
  }
  return out;
}

function formatPnlTime(ts: number) {
  if (!ts) return "—";
  try {
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Green arrow only on the current open trade's fills (capped by legs),
 * not older ENTER/ADD still sitting above the next EXIT in the log.
 */
function liveActionFlags(
  rows: NeuralLogRow[],
  inPosition: boolean,
  legs: number,
): boolean[] {
  if (!inPosition || rows.length === 0) {
    return rows.map(() => false);
  }
  const fillsNeeded = Math.max(1, Math.min(2, Math.floor(legs) || 1));
  const flags = rows.map(() => false);
  let fillsSeen = 0;
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i].line;
    if (isTradeBoundaryLog(line)) break;
    if (isFillLog(line)) {
      if (fillsSeen >= fillsNeeded) break;
      flags[i] = true;
      fillsSeen += 1;
      continue;
    }
    if (isAuxTpSlLog(line) && fillsSeen > 0) {
      flags[i] = true;
    }
  }
  return flags;
}

export default function BotTheater() {
  const { botId = "" } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState<EngineBot | null>(null);
  const [allBots, setAllBots] = useState<EngineBot[]>([]);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglePhase, setTogglePhase] = useState<"starting" | "stopping" | null>(
    null,
  );
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"5m" | "15m" | "1h">("15m");
  const [agentTab, setAgentTab] = useState(0);
  const [activityTab, setActivityTab] = useState<"log" | "pnl">("log");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [botsOpen, setBotsOpen] = useState(false);
  const [draftLeverage, setDraftLeverage] = useState(DEFAULT_LEVERAGE);
  /** Set only when user opens a market chip that has no bot yet. */
  const [createIntent, setCreateIntent] = useState<string | null>(null);
  const [createLeverage, setCreateLeverage] = useState(DEFAULT_LEVERAGE);
  const [neuralLogs, setNeuralLogs] = useState<NeuralLogRow[]>([]);
  const [availableUsdc, setAvailableUsdc] = useState<number | null>(null);
  const [apiAccount, setApiAccount] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [geometry, setGeometry] = useState<StretchGeometry>(
    DEFAULT_STRETCH_GEOMETRY,
  );
  const { canView, accountId, cred, refreshCred, accountMismatch } =
    useBotAccess();

  useEffect(() => {
    let cancelled = false;
    void fetchStrategyConfig()
      .then((cfg) => {
        if (cancelled) return;
        setGeometry({
          entryD: cfg.stretch_entry_d,
          addD: cfg.stretch_add_d,
          exitD: cfg.stretch_exit_d,
          slD: cfg.stretch_sl_d,
          minNetTpPct: cfg.min_net_tp_pct,
          maxTpOvershootD: cfg.max_tp_overshoot_d,
          takerFeeRate: cfg.idx_taker_fee_rate,
        });
      })
      .catch(() => {
        /* keep offline defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!botId) return;
    let cancelled = false;
    setBot(null);
    setNeuralLogs([]);
    setAvailableUsdc(null);
    setError(null);

    const load = async () => {
      try {
        const [res, list, logRes, acct] = await Promise.all([
          fetchBot(botId),
          fetchBots(),
          fetchBotLogs(botId, LOG_UI_LIMIT),
          fetchAccount().catch(() => null),
        ]);
        if (cancelled) return;
        setBot(res.bot);
        setAllBots(list.bots);
        setNeuralLogs(logRes.logs);
        setAvailableUsdc(
          acct != null
            ? acct.available_usdc
            : typeof res.bot.available_usdc === "number"
              ? res.bot.available_usdc
              : null,
        );
        setOnline(res.engine_online);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setOnline(false);
        setError(e instanceof Error ? e.message : "Engine offline");
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [botId]);

  const freeMarkets = AI_FUTURES_BOT_MARKETS.filter(
    (m) => !allBots.some((b) => b.symbol === m.id),
  );

  const onPickMarket = (symbolId: string) => {
    if (busy || togglePhase) return;
    const existing = allBots.find((b) => b.symbol === symbolId);
    if (existing) {
      if (existing.id !== botId) {
        navigate(`${AI_FUTURES_BOT_PATH}/${existing.id}`);
      }
      return;
    }
    // No bot for this symbol — open create sheet for that chip only.
    setCreateIntent(symbolId);
    setCreateLeverage(bot?.leverage ?? DEFAULT_LEVERAGE);
    setBotsOpen(true);
  };

  const onCreateBot = async () => {
    const symbol = createIntent;
    if (!symbol || !freeMarkets.some((m) => m.id === symbol)) return;
    setBusy(true);
    try {
      const created = await addBot(symbol, createLeverage, "live");
      setCreateIntent(null);
      setBotsOpen(false);
      navigate(`${AI_FUTURES_BOT_PATH}/${created.bot.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const onDeleteBot = async (b: EngineBot) => {
    if (b.status !== "stopped") {
      setError("Stop the bot before deleting");
      return;
    }
    if (!window.confirm(`Delete ${b.label}?`)) return;
    setBusy(true);
    try {
      await deleteBot(b.id);
      const list = await fetchBots();
      setAllBots(list.bots);
      if (b.id === botId) {
        const next = list.bots[0];
        if (next) navigate(`${AI_FUTURES_BOT_PATH}/${next.id}`);
        else navigate(AI_FUTURES_BOT_PATH);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const activeSymbol =
    bot?.symbol ||
    allBots.find((b) => b.id === botId)?.symbol ||
    "";

  const market = useMemo(() => {
    const m = AI_FUTURES_BOT_MARKETS.find((x) => x.id === activeSymbol);
    return (
      m ?? {
        id: bot?.symbol || "PERP_SOL_USDC",
        symbol: bot?.label?.replace("-PERP", "") || "SOL",
        label: bot?.label || "SOL-PERP",
        basePrice: bot?.mean_m || 0,
      }
    );
  }, [activeSymbol, bot]);

  const { snapshot } = useMarketSnapshot(market.id, timeframe);
  const running = bot?.status === "running" || bot?.status === "paused_kill";
  const mean = bot?.mean_m || snapshot?.meanM || market.basePrice;
  const price = bot?.price || snapshot?.price || mean;
  const stretch = bot?.stretch ?? snapshot?.stretch ?? 0;
  const stretchAtr = bot?.stretch_atr ?? snapshot?.stretchAtr;
  const side =
    (bot?.position.side as "long" | "short" | null) ||
    bot?.side_bias ||
    snapshot?.side ||
    null;
  const status = bot ? statusFromBot(bot) : "…";
  const todayPnl = bot?.today_pnl ?? 0;
  const openPnl = bot?.position.unrealized_pnl ?? 0;
  const logs =
    neuralLogs.length > 0
      ? neuralLogs
      : (bot?.logs ?? []).map((line) => ({ ts: 0, line }));
  const actionLogs = useMemo(
    () => logs.filter((row) => isMainActionLog(row.line)),
    [logs],
  );
  const liveLogFlags = useMemo(
    () =>
      liveActionFlags(
        actionLogs,
        !!bot && bot.position.qty > 0,
        bot?.position.legs ?? 0,
      ),
    [actionLogs, bot?.position.qty, bot?.position.legs],
  );
  const pnlHistory = useMemo(() => parsePnlHistory(logs), [logs]);

  const agentMode = (role: "market" | "risk" | "boss") => {
    if (!running) return "Idle";
    if (bot?.boss_action === "ENTER" || bot?.boss_action === "EXIT") {
      return role === "boss" ? "Acting" : "Planning";
    }
    if (bot?.boss_action === "WAIT" || bot?.boss_action === "BLOCKED") {
      return "Watching";
    }
    return "Planning";
  };

  const agents = [
    {
      name: "Market Agent",
      mode: agentMode("market"),
      thought: bot?.market_thought || "…",
      accent: "#3ecfba",
    },
    {
      name: "Risk Agent",
      mode: agentMode("risk"),
      thought: bot?.risk_thought || "…",
      accent: "#7eb8c9",
    },
    {
      name: "Boss Agent",
      mode: agentMode("boss"),
      thought: bot?.boss_thought || "…",
      accent: "#e6c35c",
    },
  ];

  // Preview leverage from the slider while settings are open; otherwise use saved lev.
  const displayLeverage = settingsOpen
    ? draftLeverage
    : (bot?.leverage ?? DEFAULT_LEVERAGE);

  // Orderly risk rate for this isolated position (mmr / margin_ratio * 100).
  const inPosition = Boolean(bot && bot.position.qty > 0);
  const riskRatePct = inPosition
    ? Number(bot?.position.risk_rate_pct ?? 0)
    : 0;
  const riskBarWidth = inPosition
    ? Math.min(100, Math.max(0, riskRatePct))
    : 0;
  const riskBarColor =
    !inPosition
      ? "bg-white/10"
      : riskRatePct >= 80
        ? "bg-[var(--afb-rose)]"
        : riskRatePct >= 40
          ? "bg-[var(--afb-amber)]"
          : "bg-[var(--afb-teal)]";
  const riskRateLabel = !inPosition
    ? "—"
    : `${Number(riskRatePct.toFixed(2)).toString().replace(/\.?0+$/, "")}%`;

  const onToggle = async () => {
    if (!bot || togglePhase) return;
    if (running) {
      setStopConfirmOpen(true);
      return;
    }
    setTogglePhase("starting");
    try {
      const res = await startBot(bot.id);
      setBot(res.bot);
      setDraftLeverage(res.bot.leverage);
      const list = await fetchBots();
      setAllBots(list.bots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setTogglePhase(null);
    }
  };

  const confirmStop = async () => {
    if (!bot || togglePhase) return;
    setStopConfirmOpen(false);
    setTogglePhase("stopping");
    try {
      const res = await stopBot(bot.id);
      setBot(res.bot);
      setDraftLeverage(res.bot.leverage);
      const list = await fetchBots();
      setAllBots(list.bots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setTogglePhase(null);
    }
  };

  const onSaveLeverage = async () => {
    if (!bot) return;
    if (draftLeverage === bot.leverage) {
      setSettingsOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await setBotLeverage(bot.id, draftLeverage);
      setBot(res.bot);
      setDraftLeverage(res.bot.leverage);
      setSettingsOpen(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update leverage");
    } finally {
      setBusy(false);
    }
  };

  const phaseId =
    bot?.boss_action === "ENTER"
      ? "plan"
      : bot?.boss_action === "ADD"
        ? "capture"
        : bot?.position.qty
          ? "ride"
          : "watch";

  // Planned add at addD × D from M while 1 leg open (worker geometry)
  const dailyTrMed = bot?.daily_tr_med ?? 0;
  const posSide = bot?.position.side;
  const plannedAdd =
    bot &&
    bot.position.qty > 0 &&
    bot.position.legs === 1 &&
    mean > 0 &&
    dailyTrMed > 0 &&
    (posSide === "long" || posSide === "short")
      ? posSide === "long"
        ? mean - geometry.addD * dailyTrMed
        : mean + geometry.addD * dailyTrMed
      : null;

  const onSaveApi = async () => {
    setBusy(true);
    try {
      await saveCredentials({
        account_id: apiAccount.trim(),
        key: apiKey.trim(),
        secret: apiSecret.trim(),
      });
      setApiKey("");
      setApiSecret("");
      await refreshCred();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save API");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnectApi = async () => {
    if (
      !window.confirm(
        "Disconnect API credentials? Running bots will be stopped. Positions will be flattened.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await disconnectCredentials();
      await refreshCred();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
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
            trading on the server when you disconnect — reconnect anytime to
            see status.
          </p>
        </div>
      </div>
    );
  }

  if (!bot && error) {
    return (
      <div className="afb-root">
        <div className="afb-content mx-auto max-w-6xl px-4 py-16">
          <p className="text-[var(--afb-rose)]">Engine offline: {error}</p>
          <Link to={AI_FUTURES_BOT_PATH} className="mt-4 inline-block text-[var(--afb-teal)]">
            ← Back to bots
          </Link>
        </div>
      </div>
    );
  }

  const renew = cred?.renew;
  const showRenew =
    renew === "soft" ||
    renew === "strong" ||
    renew === "expired" ||
    renew === "missing";

  return (
    <div className={`afb-root ${running ? "afb-running" : ""}`}>
      <div className="afb-atmosphere" aria-hidden />
      <div className="afb-content mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="flex shrink-0 rounded-xl border border-[var(--afb-line)] bg-black/30 p-1">
              {AI_FUTURES_BOT_MARKETS.map((m) => {
                const active = activeSymbol === m.id;
                const hasBot = allBots.some((b) => b.symbol === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={active}
                    onClick={() => onPickMarket(m.id)}
                    title={
                      hasBot
                        ? `Open ${m.symbol} bot`
                        : `Add ${m.symbol} bot`
                    }
                    className={`afb-display rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                      active
                        ? "bg-[var(--afb-teal)] text-[#04120f]"
                        : "text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                    }`}
                  >
                    {m.symbol}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftLeverage(bot?.leverage ?? DEFAULT_LEVERAGE);
                setSettingsOpen(true);
              }}
              className="afb-display inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-[var(--afb-line)] bg-black/30 px-2.5 text-xs font-bold tabular-nums text-[var(--afb-text)] transition-colors hover:border-[var(--afb-teal)]/40 hover:text-[var(--afb-teal)]"
              aria-label={`Leverage ${displayLeverage}×`}
              title="Leverage"
            >
              {displayLeverage}×
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateIntent(null);
                setCreateLeverage(bot?.leverage ?? DEFAULT_LEVERAGE);
                setBotsOpen(true);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--afb-line)] bg-black/30 text-[var(--afb-muted)] transition-colors hover:text-[var(--afb-text)]"
              aria-label="Manage bots"
              title="Create / manage bots"
            >
              <Cog className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy || !!togglePhase || !bot}
              onClick={() => void onToggle()}
              className={`afb-display inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold disabled:opacity-80 ${
                running || togglePhase === "stopping"
                  ? "border border-[var(--afb-line)] bg-black/30 text-[var(--afb-text)]"
                  : "bg-[var(--afb-teal)] text-[#04120f]"
              }`}
            >
              {togglePhase === "stopping" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Stopping…
                </>
              ) : togglePhase === "starting" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…
                </>
              ) : running ? (
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
        </header>

        {!online ? (
          <p className="mt-4 text-sm text-[var(--afb-rose)]">
            Engine offline — worker not reachable.
          </p>
        ) : null}

        {showRenew ? (
          <p
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              renew === "strong" || renew === "expired" || renew === "missing"
                ? "border-[var(--afb-amber)]/40 bg-[rgba(230,195,92,0.08)] text-[var(--afb-amber)]"
                : "border-[var(--afb-line)] bg-black/30 text-[var(--afb-muted)]"
            }`}
          >
            {cred?.message ||
              "Renew trading access — create a new API key from your dashboard."}{" "}
            <button
              type="button"
              className="underline hover:text-[var(--afb-text)]"
              onClick={() => {
                if (accountId) setApiAccount(accountId);
                setBotsOpen(true);
              }}
            >
              Open bot settings
            </button>
          </p>
        ) : null}

        {accountMismatch ? (
          <p className="mt-3 text-sm text-[var(--afb-amber)]">
            Connected wallet account does not match the bot API account. Switch
            wallet or update API credentials.
          </p>
        ) : null}

        <div className="relative mt-6">
          <div className="grid grid-cols-3 items-end gap-2 border-b border-[var(--afb-line)] pb-4 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--afb-muted)]">
                Status
              </p>
              <p
                className={`afb-display text-2xl font-bold tracking-tight sm:text-3xl ${
                  status === "In position"
                    ? "text-[var(--afb-amber)]"
                    : status === "Planning"
                      ? "text-[var(--afb-teal)]"
                      : status === "Paused"
                        ? "text-[var(--afb-rose)]"
                        : "text-[var(--afb-text)]"
                }`}
              >
                {status}
              </p>
            </div>
            <div className="min-w-0 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--afb-muted)]">
                Available
              </p>
              <p className="afb-display text-2xl font-bold tabular-nums text-[var(--afb-text)] sm:text-3xl">
                {availableUsdc != null
                  ? `$${availableUsdc.toFixed(2)}`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--afb-muted)]">
                USDC free to trade
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--afb-muted)]">
                Today
              </p>
              <p
                className={`afb-display text-2xl font-bold tabular-nums ${
                  todayPnl > 0
                    ? "text-[var(--afb-teal)]"
                    : todayPnl < 0
                      ? "text-[var(--afb-rose)]"
                      : "text-[var(--afb-text)]"
                }`}
              >
                {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-[var(--afb-muted)]">
                {bot && bot.position.qty > 0
                  ? `open ${openPnl >= 0 ? "+" : ""}$${openPnl.toFixed(2)}`
                  : "no open position"}
              </p>
            </div>
          </div>

          <div className="afb-fold-handle">
            <button
              type="button"
              onClick={() => setChartOpen((v) => !v)}
              aria-expanded={chartOpen}
            >
              {chartOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span className="afb-display">
                {chartOpen ? "Hide chart" : "Chart"}
              </span>
            </button>
          </div>

          <div className={`afb-chart-fold ${chartOpen ? "is-open" : ""}`}>
            <div className="afb-chart-fold-inner">
              <div className="border-b border-[var(--afb-line)] pb-5 pt-4">
                <IntentChart
                  market={market}
                  mean={mean}
                  price={price}
                  stretch={stretch}
                  side={side}
                  phaseId={phaseId}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  running={!!running}
                  candles={snapshot?.candles}
                  dailyTrMed={dailyTrMed > 0 ? dailyTrMed : null}
                  fillEntry={
                    bot && bot.position.qty > 0 ? bot.position.avg_entry : null
                  }
                  fillTp={
                    bot &&
                    bot.position.qty > 0 &&
                    (bot.position.tp_price ?? 0) > 0
                      ? bot.position.tp_price
                      : null
                  }
                  fillSl={
                    bot &&
                    bot.position.qty > 0 &&
                    (bot.position.sl_price ?? 0) > 0
                      ? bot.position.sl_price
                      : null
                  }
                  plannedAdd={plannedAdd}
                  addArmed={bot?.boss_action === "ADD"}
                  geometry={geometry}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 lg:mt-8">
          <div
            className="pointer-events-none absolute inset-0 hidden lg:block"
            aria-hidden
          >
            {/* Same arc, split at circle rim: Market→outer border | outer border→Risk */}
            <svg
              className="afb-thread absolute left-1/2 top-[42%] h-40 w-[72%] -translate-x-1/2 -translate-y-1/2 opacity-40"
              viewBox="0 0 700 160"
            >
              <path
                d="M155 86 C 171 79, 187 73, 204 68"
                fill="none"
                stroke="rgba(62,207,186,0.45)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M496 68 C 513 73, 529 79, 545 86"
                fill="none"
                stroke="rgba(62,207,186,0.45)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
            <div className="flex justify-end">
              <AgentNode {...agents[0]} />
            </div>
            <MarketPulse
              market={market}
              stretch={stretch}
              stretchAtr={stretchAtr}
              side={side}
              running={!!running}
              price={price}
              mean={mean}
            />
            <div className="flex justify-start">
              <AgentNode {...agents[1]} />
            </div>
          </div>
          <div className="relative mt-4 hidden justify-center lg:flex">
            {/* Pulse → Boss thread: same style, touches outer rim, stops above the card */}
            <svg
              className="afb-thread pointer-events-none absolute left-1/2 bottom-full h-11 w-8 -translate-x-1/2 opacity-40"
              viewBox="0 0 32 44"
              aria-hidden
            >
              <path
                d="M16 2 C 16 14, 16 26, 16 38"
                fill="none"
                stroke="rgba(62,207,186,0.45)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <AgentNode {...agents[2]} />
          </div>

          <div className="lg:hidden">
            <MarketPulse
              market={market}
              stretch={stretch}
              stretchAtr={stretchAtr}
              side={side}
              running={!!running}
              price={price}
              mean={mean}
            />
            <div className="mt-4 flex justify-center gap-2">
              {agents.map((a, i) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setAgentTab(i)}
                  className={`h-1.5 w-8 rounded-full ${
                    agentTab === i ? "bg-[var(--afb-teal)]" : "bg-white/15"
                  }`}
                  aria-label={a.name}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <AgentNode {...agents[agentTab]} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[var(--afb-line)] bg-black/25 px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="afb-display text-sm font-semibold">Position risk</p>
              <p
                className={`afb-display text-sm font-semibold tabular-nums ${
                  !inPosition
                    ? "text-[var(--afb-muted)]"
                    : riskRatePct >= 80
                      ? "text-[var(--afb-rose)]"
                      : riskRatePct >= 40
                        ? "text-[var(--afb-amber)]"
                        : "text-[var(--afb-teal)]"
                }`}
              >
                {riskRateLabel}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${riskBarColor}`}
                style={{ width: `${riskBarWidth}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--afb-line)] bg-black/25 px-4 py-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--afb-line)] bg-black/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setActivityTab("log")}
                  className={`afb-display rounded-md px-2.5 py-1 text-xs font-semibold ${
                    activityTab === "log"
                      ? "bg-white/10 text-[var(--afb-text)]"
                      : "text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                  }`}
                >
                  Log
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTab("pnl")}
                  className={`afb-display rounded-md px-2.5 py-1 text-xs font-semibold ${
                    activityTab === "pnl"
                      ? "bg-white/10 text-[var(--afb-text)]"
                      : "text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                  }`}
                >
                  P&L
                </button>
              </div>
            </div>
            {activityTab === "log" ? (
              <ul className="afb-neural-scroll custom-scrollbar h-[11.5rem] space-y-1.5 overflow-y-auto pr-1">
                {actionLogs.length === 0 ? (
                  <li className="min-h-[1.25rem] text-xs text-[var(--afb-muted)]/40">
                    <span className="mr-2 text-[var(--afb-muted)]/25">›</span>
                    Waiting for events…
                  </li>
                ) : (
                  actionLogs.map((row, i) => {
                    const isLive = liveLogFlags[i];
                    return (
                      <li
                        key={`${row.ts}-${i}-${row.line.slice(0, 24)}`}
                        className={`flex min-h-[1.25rem] items-start gap-2 text-xs ${
                          isLive
                            ? "text-[var(--afb-text)]"
                            : "text-[var(--afb-muted)]"
                        }`}
                      >
                        <span
                          className={`shrink-0 leading-snug ${
                            isLive
                              ? "text-[var(--afb-teal)]"
                              : "text-[var(--afb-teal)]/35"
                          }`}
                        >
                          ›
                        </span>
                        <LogLineBody line={row.line} />
                      </li>
                    );
                  })
                )}
              </ul>
            ) : (
              <ul className="afb-neural-scroll custom-scrollbar h-[11.5rem] space-y-1.5 overflow-y-auto pr-1">
                {pnlHistory.length === 0 ? (
                  <li className="min-h-[1.25rem] text-xs text-[var(--afb-muted)]/40">
                    No closed trades yet
                  </li>
                ) : (
                  pnlHistory.map((row, i) => (
                    <li
                      key={`${row.ts}-${i}-${row.pnl}`}
                      className="flex min-h-[1.25rem] items-baseline justify-between gap-3 text-xs"
                    >
                      <span className="min-w-0 truncate text-[var(--afb-muted)]">
                        {formatPnlTime(row.ts)}
                        {row.side ? (
                          <span
                            className={
                              row.side === "long"
                                ? "text-[var(--afb-teal)]"
                                : "text-[var(--afb-rose)]"
                            }
                          >
                            {" "}
                            · {row.side}
                          </span>
                        ) : null}
                        {row.qty != null && row.price != null ? (
                          <span className="tabular-nums">
                            {" "}
                            · {row.qty} @ {row.price}
                          </span>
                        ) : null}
                        {row.meanM != null ? (
                          <span className="tabular-nums text-[var(--afb-muted)]">
                            {" "}
                            · M {row.meanM}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          row.pnl > 0
                            ? "text-[var(--afb-teal)]"
                            : row.pnl < 0
                              ? "text-[var(--afb-rose)]"
                              : "text-[var(--afb-text)]"
                        }`}
                      >
                        {row.pnl >= 0 ? "+" : ""}${row.pnl.toFixed(2)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--afb-line)] px-4 py-2.5 text-sm text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
          >
            View Portfolio fills
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <p className="text-[11px] text-[var(--afb-muted)] sm:text-right">
            IDX AI Futures Bot · stretch-fade
          </p>
        </div>
      </div>

      {stopConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cancel stop"
            onClick={() => setStopConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="afb-display text-lg font-bold">Stop bot?</h2>
              <button
                type="button"
                onClick={() => setStopConfirmOpen(false)}
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
              for {bot?.label ?? "this perp"}.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setStopConfirmOpen(false)}
                className="afb-display flex-1 rounded-xl py-3 text-sm font-bold text-[var(--afb-text)] ring-1 ring-[var(--afb-line)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmStop()}
                className="afb-display flex-1 rounded-xl bg-[var(--afb-rose)] py-3 text-sm font-bold text-[#1a080a]"
              >
                Stop & close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="afb-display text-lg font-bold">Leverage</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-1.5 text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
              Leverage {draftLeverage}× (max {MAX_LEVERAGE}×)
              <input
                type="range"
                min={MIN_LEVERAGE}
                max={MAX_LEVERAGE}
                step={1}
                value={draftLeverage}
                disabled={busy}
                onChange={(e) => setDraftLeverage(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--afb-teal)] disabled:opacity-40"
              />
            </label>
            <p className="mt-2 text-xs leading-relaxed text-[var(--afb-text)]">
              {formatLevRiskHint(
                draftLeverage,
                estimateFullIdeaSlPct({
                  leverage: draftLeverage,
                  availableUsdc: bot?.available_usdc,
                  price: bot?.price,
                  dailyTrMed: bot?.daily_tr_med,
                }),
              )}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
              Isolated margin. Default {DEFAULT_LEVERAGE}×. Change anytime —
              applied on the next entry or add, not mid-position resize.
            </p>
            <button
              type="button"
              disabled={busy || !bot}
              onClick={() => void onSaveLeverage()}
              className="afb-display mt-5 w-full rounded-xl bg-[var(--afb-teal)] py-3 text-sm font-bold text-[#04120f] disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {botsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close bots"
            onClick={() => setBotsOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="afb-display text-lg font-bold">Bots</h2>
              <button
                type="button"
                onClick={() => setBotsOpen(false)}
                className="rounded-lg p-1.5 text-[var(--afb-muted)] hover:text-[var(--afb-text)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {allBots.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--afb-line)] bg-black/30 px-3 py-2.5"
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBotsOpen(false);
                      if (b.id !== botId) {
                        navigate(`${AI_FUTURES_BOT_PATH}/${b.id}`);
                      }
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="afb-display text-sm font-semibold text-[var(--afb-text)]">
                      {b.label}
                      {b.id === botId ? (
                        <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[var(--afb-teal)]">
                          viewing
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-[var(--afb-muted)]">
                      {b.status} · {b.leverage}×
                    </p>
                  </button>
                  {b.status === "stopped" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDeleteBot(b)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--afb-muted)] hover:text-[var(--afb-rose)]"
                      aria-label={`Delete ${b.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              {allBots.length === 0 ? (
                <p className="text-sm text-[var(--afb-muted)]">No bots yet.</p>
              ) : null}
            </div>

            <div className="mt-5 border-t border-[var(--afb-line)] pt-4">
              <h3 className="afb-display text-sm font-semibold text-[var(--afb-text)]">
                Add bot
              </h3>
              {!freeMarkets.length ? (
                <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
                  All three perps already have a bot. Delete one to add another.
                </p>
              ) : createIntent &&
                freeMarkets.some((m) => m.id === createIntent) ? (
                <>
                  <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
                    Symbol
                    <p className="afb-display mt-2 rounded-xl border border-[var(--afb-line)] bg-black/40 px-3 py-2 text-sm normal-case tracking-normal text-[var(--afb-text)]">
                      {AI_FUTURES_BOT_MARKETS.find((m) => m.id === createIntent)
                        ?.label ?? createIntent}
                    </p>
                  </label>
                  <label className="mt-4 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
                    Leverage {createLeverage}× (max {MAX_LEVERAGE}×)
                    <input
                      type="range"
                      min={MIN_LEVERAGE}
                      max={MAX_LEVERAGE}
                      step={1}
                      value={createLeverage}
                      onChange={(e) =>
                        setCreateLeverage(Number(e.target.value))
                      }
                      className="mt-3 w-full accent-[var(--afb-teal)]"
                    />
                  </label>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--afb-text)]">
                    {formatLevRiskHint(
                      createLeverage,
                      estimateFullIdeaSlPct({
                        leverage: createLeverage,
                        availableUsdc: bot?.available_usdc,
                        price: bot?.price,
                        dailyTrMed: bot?.daily_tr_med,
                      }),
                    )}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
                    One bot per perp (max 3). Default {DEFAULT_LEVERAGE}×.
                    Trades live on the network selected in the exchange.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onCreateBot()}
                    className="afb-display mt-4 w-full rounded-xl bg-[var(--afb-teal)] py-3 text-sm font-bold text-[#04120f] disabled:opacity-40"
                  >
                    Create bot
                  </button>
                </>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
                  Tap a SOL / ETH / BTC chip above to add a bot for that market.
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-[var(--afb-line)] pt-4">
              <h3 className="afb-display text-sm font-semibold text-[var(--afb-text)]">
                API access
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--afb-muted)]">
                {cred?.connected
                  ? `Portfolio API connected${
                      cred.days_left != null
                        ? ` · ~${Math.max(0, Math.floor(cred.days_left))}d left`
                        : ""
                    }. Stop/delete bot does not remove API.`
                  : "Save Orderly keys from your dashboard. Worker keeps trading after wallet disconnect."}
              </p>
              <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
                Account ID
                <input
                  value={apiAccount}
                  onChange={(e) => setApiAccount(e.target.value)}
                  placeholder={accountId || cred?.account_id || "orderly account id"}
                  className="mt-2 w-full rounded-xl border border-[var(--afb-line)] bg-black/40 px-3 py-2 text-sm normal-case tracking-normal text-[var(--afb-text)]"
                />
              </label>
              <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
                Orderly key
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ed25519:…"
                  className="mt-2 w-full rounded-xl border border-[var(--afb-line)] bg-black/40 px-3 py-2 text-sm normal-case tracking-normal text-[var(--afb-text)]"
                />
              </label>
              <label className="mt-3 block text-xs uppercase tracking-wider text-[var(--afb-muted)]">
                Secret
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-[var(--afb-line)] bg-black/40 px-3 py-2 text-sm normal-case tracking-normal text-[var(--afb-text)]"
                />
              </label>
              <button
                type="button"
                disabled={busy || !apiAccount.trim() || !apiKey.trim() || !apiSecret.trim()}
                onClick={() => void onSaveApi()}
                className="afb-display mt-4 w-full rounded-xl bg-[var(--afb-teal)] py-3 text-sm font-bold text-[#04120f] disabled:opacity-40"
              >
                Save API key
              </button>
              {cred?.source === "store" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDisconnectApi()}
                  className="afb-display mt-2 w-full rounded-xl border border-[var(--afb-line)] py-3 text-sm font-bold text-[var(--afb-muted)] hover:text-[var(--afb-rose)]"
                >
                  Disconnect API
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
