import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
  Settings2,
  X,
} from "lucide-react";
import {
  AI_FUTURES_BOT_MARKETS,
  AI_FUTURES_BOT_MENU_NAME,
  AI_FUTURES_BOT_PRODUCT_ID,
  AI_FUTURES_BOT_STRATEGY_ID,
  type AiFuturesBotMarket,
} from "./constants";
import IntentChart from "./IntentChart";
import { useMarketSnapshot } from "./market";
import {
  DEFAULT_LEVERAGE,
  MAX_LEVERAGE,
  MIN_LEVERAGE,
  formatLevRiskHint,
} from "./leverageRisk";
import "./ai-futures-bot.css";

type CaptureTone = "opportunity" | "win" | "loss" | "info";

type Phase = {
  id: string;
  status: string;
  stretch: number;
  side: "long" | "short" | null;
  market: string;
  risk: string;
  boss: string;
  log: string;
  capture?: {
    title: string;
    pnl: number;
    tone: CaptureTone;
    eyebrow: string;
  };
  positionPnl?: number;
  bank?: number;
};

type CaptureState = {
  title: string;
  pnl: number;
  tone: CaptureTone;
  eyebrow: string;
  key: string;
};

const LOG_SLOTS = 6;

const PHASES: Phase[] = [
  {
    id: "watch",
    status: "Waiting",
    stretch: 0.18,
    side: null,
    market: "Scanning {symbol} against session mean…",
    risk: "2× clear · size staged · no add needed",
    boss: "Hold. Stretch not deep enough.",
    log: "Market watching — no edge yet",
  },
  {
    id: "build",
    status: "Waiting",
    stretch: 0.52,
    side: "long",
    market: "Stretch building below mean — fade setup forming",
    risk: "Room for 1 add · daily kill armed",
    boss: "Arming. Waiting for cleaner stretch.",
    log: "Stretch rising — agents aligning",
  },
  {
    id: "plan",
    status: "Planning",
    stretch: 0.78,
    side: "long",
    market: "Opportunity: fade long toward mean",
    risk: "Allow entry · leverage locked 2×",
    boss: "GO — capture the stretch fade",
    log: "Boss approved long fade",
    capture: {
      title: "Fade setup ready",
      pnl: 0,
      tone: "opportunity",
      eyebrow: "Opportunity",
    },
  },
  {
    id: "capture",
    status: "In position",
    stretch: 0.72,
    side: "long",
    market: "Filled long · riding reclaim to mean",
    risk: "1 / 2 legs used · liq distance healthy",
    boss: "Manage. No chase. Let mean pull.",
    log: "CAPTURE — long fade entered",
    capture: {
      title: "Entered long fade",
      pnl: 0,
      tone: "opportunity",
      eyebrow: "Opportunity captured",
    },
    positionPnl: 1.8,
  },
  {
    id: "ride",
    status: "In position",
    stretch: 0.4,
    side: "long",
    market: "Price reclaiming · stretch compressing",
    risk: "Exposure ok · trail toward mean",
    boss: "Stay with it — mean still ahead",
    log: "Position breathing toward mean",
    positionPnl: 4.6,
  },
  {
    id: "take",
    status: "In position",
    stretch: 0.16,
    side: "long",
    market: "Near mean — exit window open",
    risk: "Lock gains · flatten recommended",
    boss: "Take profit — reclaim complete",
    log: "Boss: take profit",
    capture: {
      title: "Closed · mean reclaim",
      pnl: 8.4,
      tone: "win",
      eyebrow: "Win",
    },
    positionPnl: 8.4,
    bank: 8.4,
  },
  {
    id: "cut",
    status: "Paused",
    stretch: 0.88,
    side: "long",
    market: "Trend continuation — stretch not reclaiming",
    risk: "Daily buffer hit · cut loss",
    boss: "FLAT — protect capital",
    log: "Boss: cut loss · trend pause",
    capture: {
      title: "Stopped · trend pause",
      pnl: -6.2,
      tone: "loss",
      eyebrow: "Loss cut",
    },
    bank: -6.2,
  },
  {
    id: "reset",
    status: "Waiting",
    stretch: 0.12,
    side: null,
    market: "Flat. Watching for the next stretch…",
    risk: "Reset · daily loss buffer intact",
    boss: "Pause new risk. Scan continues.",
    log: "Cycle complete — waiting again",
    capture: {
      title: "Mind reset · scanning again",
      pnl: 0,
      tone: "info",
      eyebrow: "Status",
    },
  },
];

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
      <p
        key={thought}
        className="afb-thought text-[13px] leading-relaxed text-[var(--afb-muted)]"
      >
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
  live,
}: {
  market: AiFuturesBotMarket;
  stretch: number;
  stretchAtr?: number;
  side: Phase["side"];
  running: boolean;
  price: number;
  mean: number;
  live: boolean;
}) {
  const stretchPct = Math.round(stretch * 100);
  // Bias needle on the mean axis: left = long stretch, right = short. Clamp inside the bar.
  const needleRaw = stretch * 40 * (side === "short" ? 1 : side === "long" ? -1 : 0);
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
      {running ? (
        <>
          <div className="afb-pulse-ring absolute inset-[4%] rounded-full border border-[var(--afb-teal-dim)]" />
          <div
            className="afb-pulse-ring absolute inset-[4%] rounded-full border border-[var(--afb-teal-dim)]"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      ) : null}

      <svg
        className="afb-orbit absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 340 340"
        aria-hidden
      >
        <circle
          cx="170"
          cy="170"
          r="148"
          fill="none"
          stroke="rgba(140,190,200,0.16)"
          strokeWidth="1"
          strokeDasharray="2 10"
        />
        <circle cx="170" cy="22" r="3" fill="var(--afb-teal)" />
        <circle cx="300" cy="170" r="2.5" fill="var(--afb-amber)" />
      </svg>

      <svg
        className="afb-scan absolute inset-[18%] h-[64%] w-[64%] opacity-70"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <path
          d="M20 100 Q 100 20 180 100"
          fill="none"
          stroke="rgba(62,207,186,0.35)"
          strokeWidth="1.5"
        />
        <path
          d="M30 120 Q 100 170 170 120"
          fill="none"
          stroke="rgba(230,195,92,0.28)"
          strokeWidth="1.2"
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--afb-muted)]">
          Market pulse{live ? " · live" : ""}
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
        {stretchAtr != null && live ? (
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
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--afb-teal)] transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.max(8, stretchPct)}%`,
                boxShadow: "0 0 16px var(--afb-teal-glow)",
              }}
            />
          </div>
          <div className="relative mt-3 h-8 overflow-hidden">
            <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-[var(--afb-line)]" />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[var(--afb-amber)] transition-[left] duration-700 ease-out"
              style={{
                left: `calc(50% + ${needle}%)`,
                boxShadow: "0 0 14px var(--afb-amber-glow)",
              }}
              aria-hidden
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--afb-muted)]">
            {side === "long"
              ? "Bias: fade long"
              : side === "short"
                ? "Bias: fade short"
                : "Bias: neutral"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AiFuturesBotTheater() {
  const [marketId, setMarketId] = useState(AI_FUTURES_BOT_MARKETS[0].id);
  const [running, setRunning] = useState(true);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [todayPnl, setTodayPnl] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "Brain online — waiting for stretch",
  ]);
  const [capture, setCapture] = useState<CaptureState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [agentTab, setAgentTab] = useState(0);
  const [chartOpen, setChartOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<"5m" | "15m" | "1h">("15m");

  const market = useMemo(
    () =>
      AI_FUTURES_BOT_MARKETS.find((m) => m.id === marketId) ??
      AI_FUTURES_BOT_MARKETS[0],
    [marketId],
  );

  const { snapshot, loading: marketLoading, error: marketError } =
    useMarketSnapshot(market.id, timeframe);

  const phase = PHASES[phaseIndex];
  const live = Boolean(snapshot && snapshot.meanM > 0 && snapshot.price > 0);
  const mean = live ? snapshot!.meanM : market.basePrice;
  const price = live
    ? snapshot!.price
    : mean *
      (1 - (phase.side === "short" ? -1 : 1) * phase.stretch * 0.035);
  const liveStretch = live ? snapshot!.stretch : phase.stretch;
  const liveSide = live ? snapshot!.side : phase.side;
  const stretchAtr = live ? snapshot!.stretchAtr : undefined;

  const fillThought = useCallback(
    (template: string) => template.replaceAll("{symbol}", market.symbol),
    [market.symbol],
  );

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => {
      setPhaseIndex((prev) => {
        const next = (prev + 1) % PHASES.length;
        const p = PHASES[next];
        setLogs((old) => {
          const line = `${market.symbol}: ${p.log}`;
          return [line, ...old].slice(0, LOG_SLOTS);
        });
        if (p.bank) {
          setTodayPnl((v) => Number((v + p.bank).toFixed(2)));
        }
        if (p.capture) {
          setCapture({
            title: p.capture.title,
            pnl: p.capture.pnl,
            tone: p.capture.tone,
            eyebrow: p.capture.eyebrow,
            key: `${next}-${Date.now()}`,
          });
        } else {
          setCapture(null);
        }
        return next;
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [running, market.symbol]);

  useEffect(() => {
    setPhaseIndex(0);
    setCapture(null);
    setLogs([`${market.symbol} selected — scanning session mean`]);
  }, [marketId, market.symbol]);

  const agentMode = (role: "market" | "risk" | "boss") => {
    if (!running) return "Idle";
    if (phase.id === "capture" || phase.id === "take" || phase.id === "cut") {
      if (role === "boss" || role === "market") return "Acting";
      return "Planning";
    }
    if (phase.id === "plan") {
      if (role === "boss") return "Acting";
      return "Planning";
    }
    if (phase.id === "build") return "Planning";
    return "Watching";
  };

  const riskScore = Math.min(
    100,
    Math.round(
      (leverage / MAX_LEVERAGE) * 55 +
        liveStretch * 35 +
        (phase.status === "In position" ? 15 : 0),
    ),
  );

  const agents = [
    {
      name: "Market Agent",
      mode: agentMode("market"),
      thought: fillThought(phase.market),
      accent: "#3ecfba",
    },
    {
      name: "Risk Agent",
      mode: agentMode("risk"),
      thought: fillThought(phase.risk),
      accent: "#7eb8c9",
    },
    {
      name: "Boss Agent",
      mode: agentMode("boss"),
      thought: fillThought(phase.boss),
      accent: "#e6c35c",
    },
  ];

  return (
    <div
      className={`afb-root ${running ? "afb-running" : ""}`}
      data-product-id={AI_FUTURES_BOT_PRODUCT_ID}
      data-strategy-id={AI_FUTURES_BOT_STRATEGY_ID}
    >
      <div className="afb-atmosphere" aria-hidden />

      <div className="afb-content mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--afb-teal)]">
              IDX · live mind
            </p>
            <h1 className="afb-display mt-1 text-3xl font-extrabold tracking-tight text-[var(--afb-text)] sm:text-4xl md:text-[2.75rem]">
              {AI_FUTURES_BOT_MENU_NAME}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--afb-muted)]">
              Watch three agents read the market, gate risk, and capture stretch
              fades on any Orderly perp — not a silent dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="flex rounded-xl border border-[var(--afb-line)] bg-black/30 p-1">
              {AI_FUTURES_BOT_MARKETS.map((m) => {
                const active = m.id === marketId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMarketId(m.id)}
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
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--afb-line)] bg-black/30 text-[var(--afb-muted)] transition-colors hover:text-[var(--afb-text)]"
              aria-label="Open settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--afb-line)] pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--afb-muted)]">
                Status
              </p>
              <p
                key={phase.status}
                className={`afb-display afb-thought text-2xl font-bold tracking-tight sm:text-3xl ${
                  phase.status === "In position"
                    ? "text-[var(--afb-amber)]"
                    : phase.status === "Planning"
                      ? "text-[var(--afb-teal)]"
                      : phase.status === "Paused"
                        ? "text-[var(--afb-rose)]"
                        : "text-[var(--afb-text)]"
                }`}
              >
                {running ? phase.status : "Stopped"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--afb-muted)]">
                Today
              </p>
              <p
                className={`afb-display text-2xl font-bold tabular-nums ${
                  todayPnl > 0
                    ? "text-[var(--afb-teal)]"
                    : "text-[var(--afb-text)]"
                }`}
              >
                {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}
              </p>
              {phase.positionPnl != null &&
              running &&
              phase.status === "In position" ? (
                <p className="mt-0.5 text-xs tabular-nums text-[var(--afb-amber)]">
                  open +${phase.positionPnl.toFixed(2)}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-[var(--afb-muted)]">
                  {live
                    ? "live market · demo mind"
                    : marketLoading
                      ? "loading market…"
                      : marketError
                        ? "market offline · demo mind"
                        : "design preview · demo mind"}
                </p>
              )}
            </div>
          </div>

          <div className="afb-fold-handle">
            <button
              type="button"
              onClick={() => setChartOpen((v) => !v)}
              aria-expanded={chartOpen}
              aria-controls="afb-intent-chart-panel"
            >
              {chartOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span className="afb-display">{chartOpen ? "Hide chart" : "Chart"}</span>
            </button>
          </div>

          <div
            id="afb-intent-chart-panel"
            className={`afb-chart-fold ${chartOpen ? "is-open" : ""}`}
          >
            <div className="afb-chart-fold-inner">
              <div className="border-b border-[var(--afb-line)] pb-5 pt-4">
                <IntentChart
                  market={market}
                  mean={mean}
                  price={price}
                  stretch={liveStretch}
                  side={liveSide ?? phase.side}
                  phaseId={phase.id}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  running={running}
                  candles={snapshot?.candles}
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
              stretch={liveStretch}
              stretchAtr={stretchAtr}
              side={liveSide}
              running={running}
              price={price}
              mean={mean}
              live={live}
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
              stretch={liveStretch}
              stretchAtr={stretchAtr}
              side={liveSide}
              running={running}
              price={price}
              mean={mean}
              live={live}
            />

            <div className="mt-4 flex justify-center gap-2">
              {agents.map((a, i) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setAgentTab(i)}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    agentTab === i ? "bg-[var(--afb-teal)]" : "bg-white/15"
                  }`}
                  aria-label={`Show ${a.name}`}
                />
              ))}
            </div>

            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {agents.map((a, i) => (
                <div
                  key={a.name}
                  className={`shrink-0 ${agentTab === i ? "opacity-100" : "opacity-70"}`}
                  onFocus={() => setAgentTab(i)}
                >
                  <AgentNode {...a} />
                </div>
              ))}
            </div>
          </div>

          {capture ? (
            <div
              key={capture.key}
              className={`afb-capture-banner afb-capture-${capture.tone} pointer-events-none absolute left-1/2 top-2 z-20 w-[min(92%,360px)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-center backdrop-blur-md sm:top-6`}
            >
              <p className="afb-capture-eyebrow text-[10px] uppercase tracking-[0.2em]">
                {capture.eyebrow}
              </p>
              <p className="afb-display mt-1 text-lg font-bold text-[var(--afb-text)]">
                {capture.title}
              </p>
              {capture.pnl !== 0 ? (
                <p
                  className={`mt-0.5 text-sm tabular-nums ${
                    capture.pnl > 0
                      ? "text-[var(--afb-teal)]"
                      : "text-[var(--afb-rose)]"
                  }`}
                >
                  {capture.pnl > 0 ? "+" : ""}${capture.pnl.toFixed(2)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[var(--afb-line)] bg-black/25 px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="afb-display text-sm font-semibold">Position risk</p>
              <p className="text-[11px] uppercase tracking-wider text-[var(--afb-muted)]">
                {phase.status === "In position"
                  ? riskScore < 35
                    ? "Low"
                    : riskScore < 65
                      ? "Balanced"
                      : "Elevated"
                  : "—"}{" "}
                · {leverage}×
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width:
                    phase.status === "In position" ? `${riskScore}%` : "0%",
                  background:
                    riskScore < 35
                      ? "linear-gradient(90deg, #3ecfba, #6ee7d0)"
                      : riskScore < 65
                        ? "linear-gradient(90deg, #3ecfba, #e6c35c)"
                        : "linear-gradient(90deg, #e6c35c, #f07178)",
                }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--afb-muted)]">
              Exchange-style position risk when in a trade — empty when flat.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--afb-line)] bg-black/25 px-4 py-4">
            <p className="afb-display mb-2 text-sm font-semibold">Neural log</p>
            <ul className="space-y-1.5">
              {Array.from({ length: LOG_SLOTS }, (_, i) => {
                const line = logs[i];
                return (
                  <li
                    key={line ? `${line}-${i}` : `log-slot-${i}`}
                    className={`min-h-[1.25rem] text-xs leading-relaxed ${
                      i === 0 && line
                        ? "text-[var(--afb-text)]"
                        : "text-[var(--afb-muted)]"
                    }`}
                  >
                    {line ? (
                      <>
                        <span className="mr-2 text-[var(--afb-teal)]/70">›</span>
                        {line}
                      </>
                    ) : (
                      <span className="select-none text-[var(--afb-muted)]/25">
                        ›
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/portfolio"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--afb-line)] px-4 py-2.5 text-sm text-[var(--afb-muted)] transition-colors hover:border-[var(--afb-teal)]/40 hover:text-[var(--afb-text)]"
          >
            View Portfolio fills
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <p className="text-[11px] text-[var(--afb-muted)] sm:text-right">
            Product id{" "}
            <span className="text-[var(--afb-text)]/80">
              {AI_FUTURES_BOT_PRODUCT_ID}
            </span>
            {" · "}
            demo loop for design review
          </p>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-[var(--afb-line)] bg-[rgba(6,8,12,0.92)] px-4 py-3 backdrop-blur-xl sm:static sm:mt-2 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:px-6">
          <div className="min-w-0 sm:hidden">
            <p className="afb-display truncate text-sm font-semibold">
              {running ? phase.status : "Stopped"}
            </p>
            <p className="truncate text-[11px] text-[var(--afb-muted)]">
              {market.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className={`afb-display inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide transition-transform active:scale-[0.98] sm:ml-auto sm:min-w-[200px] sm:flex-none ${
              running
                ? "bg-white/10 text-[var(--afb-text)] ring-1 ring-[var(--afb-line)]"
                : "bg-[var(--afb-teal)] text-[#04120f] shadow-[0_0_30px_var(--afb-teal-glow)]"
            }`}
          >
            {running ? (
              <>
                <Pause className="h-4 w-4" /> Pause mind
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Start mind
              </>
            )}
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close settings"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[var(--afb-line)] bg-[#0a0f14] p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="afb-display text-lg font-bold">Mind settings</h2>
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
              <span className="mt-2 block text-sm normal-case tracking-normal text-[var(--afb-text)]">
                {formatLevRiskHint(leverage, null)}
              </span>
            </label>
            <p className="mt-3 text-xs leading-relaxed text-[var(--afb-muted)]">
              Default {DEFAULT_LEVERAGE}×. Higher leverage is optional risk.
              This page is the experience shell — agents, capture moments,
              multi-market.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
