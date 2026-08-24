import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FUTURES_URL } from "@/config/exchange/urls";
import { withBasePath } from "@/utils/base-path";

const SLIDES = [
  {
    id: "testnet",
    title: "Switch to Solana Devnet",
    body: "Open the exchange, tap Network in the header, choose Testnet, then select Solana Devnet.",
    type: "video" as const,
    src: withBasePath("/exchange-home/demo-guide/connect-testnet.mp4"),
  },
  {
    id: "wallet",
    title: "Connect your wallet",
    body: "Connect with IDX Wallet or another wallet to create your account and start trading.",
    type: "video" as const,
    src: withBasePath("/exchange-home/demo-guide/connect-wallet.mp4"),
    mediaPosition: "top-right" as const,
  },
  {
    id: "faucet",
    title: "Get free test USDC",
    body: "Tap Get test USDC and wait a few seconds for the funds to arrive in your account.",
    type: "image" as const,
    src: withBasePath("/exchange-home/demo-guide/get-test-usdc.png"),
    mediaFit: "contain" as const,
  },
  {
    id: "ready",
    title: "You're ready to demo trade",
    body: "Free test USDC shows in My Assets — start trading on the demo account.",
    type: "image" as const,
    src: withBasePath("/exchange-home/demo-guide/free-usdc.png"),
  },
];

export default function DemoGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  const titleId = useId();
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const last = index >= SLIDES.length - 1;
  const slide = SLIDES[index];

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight" && index < SLIDES.length - 1) {
        setIndex((i) => i + 1);
      }
      if (e.key === "ArrowLeft" && index > 0) {
        setIndex((i) => i - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, index]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || slide?.type !== "video") return;
    el.currentTime = 0;
    const play = el.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }, [index, open, slide?.type]);

  if (!open) return null;

  return (
    <div
      className="ex-demo-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="ex-demo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="ex-demo-close"
          aria-label="Close demo guide"
          onClick={onClose}
        >
          ×
        </button>

        <div className="ex-demo-media" key={slide.id}>
          {slide.type === "video" ? (
            <video
              ref={videoRef}
              className={[
                "ex-demo-media-el",
                slide.mediaPosition === "top-right" ? "is-top-right" : "",
                slide.mediaFit === "contain" ? "is-contain" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              src={slide.src}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
            />
          ) : (
            <img
              className={[
                "ex-demo-media-el",
                slide.mediaPosition === "top-right" ? "is-top-right" : "",
                slide.mediaFit === "contain" ? "is-contain" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              src={slide.src}
              alt=""
              draggable={false}
            />
          )}
        </div>

        <div className="ex-demo-copy">
          <p className="ex-demo-step">
            Step {index + 1} of {SLIDES.length}
          </p>
          <h2 id={titleId} className="ex-demo-title">
            {slide.title}
          </h2>
          <p className="ex-demo-body">{slide.body}</p>
        </div>

        <div className="ex-demo-dots" role="tablist" aria-label="Guide steps">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to step ${i + 1}`}
              className={`ex-demo-dot${i === index ? " is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        <div className="ex-demo-footer">
          {index > 0 ? (
            <button
              type="button"
              className="ex-demo-btn ex-demo-btn-ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
          ) : (
            <span className="ex-demo-spacer" />
          )}
          {last ? (
            <Link
              className="ex-demo-btn ex-demo-btn-primary"
              to={FUTURES_URL}
              onClick={() => onClose?.()}
            >
              Start demo account
            </Link>
          ) : (
            <button
              type="button"
              className="ex-demo-btn ex-demo-btn-primary"
              onClick={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
