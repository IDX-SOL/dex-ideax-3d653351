import { ExchangeMarketingFooter } from "@/components/exchange-home/ExchangeMarketingFooter";

export function MarketingLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="idx-marketing-layout-shell">
      <div className="idx-marketing-layout-shell__content">{children}</div>
      <ExchangeMarketingFooter />
    </div>
  );
}
