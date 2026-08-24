import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { DEMO_GUIDE_OPEN_EVENT } from "@/components/exchange-home/ExchangeMarketingFooter";
import MarketsGrid from "@/components/exchange-home/MarketsGrid";
import MarketsSnapshot from "@/components/exchange-home/MarketsSnapshot";
import NewListingsStack from "@/components/exchange-home/NewListingsStack";
import { TICKER, tickerIcon } from "@/config/exchange/ticker";
import {
  AFFILIATE_URL,
  API_KEYS_URL,
  DOCS_URL,
  FUTURES_URL,
  LAUNCHLAB_URL,
  SWAP_URL,
} from "@/config/exchange/urls";
import { fetchTickerQuotes } from "@/lib/exchange/exchangeData";
import { withBasePath } from "@/utils/base-path";
import "@/styles/exchange-home.css";

function formatMark(price: number) {
  if (!(price > 0)) return "";
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  })}`;
}

function formatChange(changePct: number | null | undefined) {
  if (changePct == null || Number.isNaN(changePct)) return "";
  const abs = Math.abs(changePct).toFixed(2);
  return `${changePct >= 0 ? "+" : "−"}${abs}%`;
}

type Quote = { price: number | null; changePct: number | null };

export default function ExchangeHomePage() {
  const [shiftPx, setShiftPx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const shiftLocked = useRef(false);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  const openDemoGuide = () => {
    window.dispatchEvent(new CustomEvent(DEMO_GUIDE_OPEN_EVENT));
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const body = await fetchTickerQuotes();
        if (!alive || !Array.isArray(body.items)) return;
        setQuotes((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const item of body.items) {
            const old = prev[item.id];
            if (
              !old ||
              old.price !== item.price ||
              old.changePct !== item.changePct
            ) {
              next[item.id] = item;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {
        /* keep last quotes */
      }
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (shiftLocked.current || !Object.keys(quotes).length) return;
    const el = trackRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      if (shiftLocked.current) return;
      const half = el.scrollWidth / 2;
      if (half > 0) {
        shiftLocked.current = true;
        setShiftPx(half);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [quotes]);

  return (
    <div className="ex-root">
      <div className="ex-page">
        <div className="ex-fold">
          <section className="ex-hero">
            <div className="ex-wrap ex-hero-grid">
              <div>
                <p className="ex-kicker">Perpetual futures</p>
                <h1 className="ex-h1">
                  Trade perps on Bitcoin, Gold, Nvidia, and Nasdaq. No KYC.
                </h1>
                <p className="ex-lede">
                  Wallet-funded. You keep the keys. Lite or Pro. Demo with free
                  test USDC. Up to 100x on eligible markets — BTC, ETH, SOL, and
                  a book that goes far past coins.
                </p>
                <div className="ex-actions">
                  <Link className="ex-btn ex-btn-primary" to={FUTURES_URL}>
                    Start trading
                  </Link>
                  <button
                    type="button"
                    className="ex-btn ex-btn-ghost"
                    onClick={openDemoGuide}
                  >
                    Try demo — free test USDC
                  </button>
                </div>
              </div>
              <div className="ex-stage">
                <div className="ex-device ex-device-laptop">
                  <div className="ex-device-lid">
                    <div className="ex-device-screen">
                      <span className="ex-device-notch" aria-hidden="true" />
                      <img
                        className="ex-shot"
                        src={withBasePath("/exchange-home/trade-desktop.png")}
                        alt="IDX Exchange Pro terminal on MacBook"
                      />
                    </div>
                  </div>
                  <div className="ex-device-base" aria-hidden="true">
                    <span className="ex-device-hinge" />
                    <span className="ex-device-thumb" />
                  </div>
                </div>
                <div className="ex-device ex-device-phone">
                  <span className="ex-device-btn ex-device-btn-silent" aria-hidden="true" />
                  <span className="ex-device-btn ex-device-btn-vol" aria-hidden="true" />
                  <span className="ex-device-btn ex-device-btn-power" aria-hidden="true" />
                  <div className="ex-device-screen">
                    <span className="ex-device-island" aria-hidden="true" />
                    <img
                      className="ex-shot"
                      src={withBasePath("/exchange-home/trade-mobile.png")}
                      alt="IDX Exchange on iPhone"
                    />
                  </div>
                </div>
                <div className="ex-device ex-device-ipad">
                  <span className="ex-device-cam" aria-hidden="true" />
                  <div className="ex-device-screen">
                    <img
                      className="ex-shot"
                      src={withBasePath("/exchange-home/trade-ipad.png")}
                      alt="IDX Exchange on iPad"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="ex-ticker" aria-label="Live perpetual prices">
            <div
              ref={trackRef}
              className={`ex-ticker-track${shiftPx ? " is-ready" : ""}`}
              style={
                shiftPx
                  ? ({ "--ex-ticker-shift": `${shiftPx}px` } as CSSProperties)
                  : undefined
              }
            >
              {[0, 1].map((dup) => (
                <div key={dup} className="ex-ticker-dup">
                  {TICKER.map((sym) => {
                    const quote = quotes[sym];
                    const change = formatChange(quote?.changePct);
                    const up = (quote?.changePct ?? 0) > 0;
                    const down = (quote?.changePct ?? 0) < 0;
                    return (
                      <div className="ex-ticker-item" key={`${dup}-${sym}`}>
                        <img
                          className="ex-ticker-icon"
                          src={tickerIcon(sym)}
                          alt=""
                          width={18}
                          height={18}
                        />
                        <b>{sym}</b>
                        <span className="ex-ticker-quote">
                          <span className="ex-ticker-price">
                            {quote?.price ? formatMark(quote.price) : "\u00a0"}
                          </span>
                          <span
                            className={
                              up
                                ? "ex-ticker-chg is-up"
                                : down
                                  ? "ex-ticker-chg is-down"
                                  : "ex-ticker-chg"
                            }
                          >
                            {change || "\u00a0"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section
          className="ex-section ex-section-markets"
          id="markets"
          aria-label="Market snapshot"
        >
          <div className="ex-wrap ex-markets-snapshot">
            <header className="ex-markets-snapshot-intro">
              <h2 className="ex-h2">Market overview</h2>
            </header>
            <MarketsSnapshot />
            <MarketsGrid />
            <NewListingsStack />
          </div>
        </section>

        <section className="ex-section" id="swap">
          <div className="ex-wrap ex-swap">
            <header className="ex-swap-intro">
              <p className="ex-kicker">Swap</p>
              <h2 className="ex-h2">
                Trade the perp.
                <br />
                Bridge the token.
                <br />
                Same wallet.
              </h2>
            </header>
            <figure className="ex-swap-visual">
              <img
                className="ex-swap-shot"
                src={withBasePath("/exchange-home/swap-desktop.png")}
                alt="IDX Swap — chart, route, and swap panel"
              />
            </figure>
            <div className="ex-swap-after">
              <p className="ex-copy">
                Routes and swaps in one place — move between futures and spot
                without leaving IDX.
              </p>
              <div className="ex-actions">
                <Link className="ex-btn ex-btn-primary" to={SWAP_URL}>
                  Open Bridge
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          className="ex-section ex-section-alt ex-launch-section"
          id="launch"
        >
          <div className="ex-wrap ex-launch">
            <div className="ex-launch-copy">
              <p className="ex-kicker">Launch then list</p>
              <h2 className="ex-h2">
                Launch a coin on IDX.
                <br />
                Ask us to list the perp.
              </h2>
              <p className="ex-copy">
                Review is required — not instant, not self-serve.
              </p>
              <div className="ex-actions">
                <a className="ex-btn ex-btn-primary" href={LAUNCHLAB_URL}>
                  Launch a coin
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="ex-section ex-api-section" id="api">
          <div className="ex-wrap ex-api">
            <figure className="ex-api-visual">
              <img
                className="ex-api-shot"
                src={withBasePath("/exchange-home/api-autobot.png")}
                alt="IDX AutoBot — automated trading on IDX"
                width={440}
                height={640}
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div className="ex-api-copy">
              <p className="ex-kicker">Developer API</p>
              <h2 className="ex-h2">
                Build trading bots
                <br />
                in the AI era.
              </h2>
              <p className="ex-copy">
                Create API keys for your setup — market data, order routing,
                and automation on IDX perps. Run your own strategies or plug
                into AI-driven bots.
              </p>
              <div className="ex-actions">
                <Link className="ex-btn ex-btn-primary" to={API_KEYS_URL}>
                  Create API keys
                </Link>
                <a
                  className="ex-btn ex-btn-ghost"
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  API docs
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="ex-section ex-section-refer" id="refer">
          <div className="ex-wrap ex-refer">
            <header className="ex-refer-intro">
              <p className="ex-kicker">Referral</p>
              <h2 className="ex-h2 ex-h2-sm">Invite traders. Earn on volume.</h2>
              <p className="ex-copy">
                They get fee rebates. You earn when they trade.
              </p>
              <p className="ex-copy ex-refer-note">
                Bind a code on IDX to start.
              </p>
              <div className="ex-actions">
                <Link className="ex-btn ex-btn-primary" to={AFFILIATE_URL}>
                  Invite &amp; earn
                </Link>
              </div>
            </header>
          </div>
        </section>
      </div>
    </div>
  );
}
