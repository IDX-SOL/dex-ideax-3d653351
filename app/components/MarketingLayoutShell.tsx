import { ExchangeMarketingFooter } from "@/components/exchange-home/ExchangeMarketingFooter";

export function MarketingLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="idx-marketing-layout-shell">
      <main id="main-content" className="idx-marketing-layout-shell__content">
        {children}
      </main>
      <ExchangeMarketingFooter />
    </div>
  );
}
