import { cn } from "@orderly.network/ui";
import { useTradingMode } from "@/hooks/useTradingMode";
import type { TradingMode } from "@/utils/trading-mode";

const OPTIONS: { id: TradingMode; label: string }[] = [
  { id: "lite", label: "Lite" },
  { id: "pro", label: "Pro" },
];

export function TradingModeToggle({ className }: { className?: string }) {
  const { mode, setTradingMode } = useTradingMode();

  return (
    <div
      role="group"
      aria-label="Trading mode"
      className={cn("idx-trading-mode-toggle", className)}
    >
      {OPTIONS.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => setTradingMode(option.id)}
            className={cn(
              "idx-trading-mode-toggle__btn",
              active && "idx-trading-mode-toggle__btn--active",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
