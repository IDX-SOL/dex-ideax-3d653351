import { Outlet, useLocation } from "react-router-dom";
import { PortfolioLayoutWidget } from "@orderly.network/portfolio";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

/** Mobile sub-nav back target — always portfolio overview, not the current sub-route. */
function portfolioInitialMenu(_pathname: string): string {
  return "/portfolio";
}

/** Keep mobile main nav out of sub-page mode on portfolio sub-routes. */
function portfolioNavCurrent(pathname: string): string {
  if (pathname.startsWith("/portfolio/api-key")) return "/portfolio/api-key";
  if (pathname.startsWith("/portfolio")) return "/portfolio";
  return pathname;
}

/** Orderly sidebar hrefs differ from app routes for fee tier + API keys. */
function portfolioSidebarCurrent(pathname: string): string {
  if (pathname.startsWith("/portfolio/api-key")) return "/portfolio/apiKey";
  if (pathname.startsWith("/portfolio/fee")) return "/portfolio/feeTier";
  return pathname;
}

export default function PortfolioLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const { onRouteChange } = useNav();
  const config = useOrderlyConfig();

  const mainNavProps = {
    ...config.scaffold.mainNavProps,
    initialMenu: portfolioInitialMenu(pathname),
    current: portfolioNavCurrent(pathname),
  };

  const routerAdapter = {
    onRouteChange,
    currentPath: pathname,
  };

  return (
    <PortfolioLayoutWidget
      footer={<HiddenScaffoldFooter />}
      mainNavProps={mainNavProps}
      routerAdapter={routerAdapter}
      leftSideProps={{
        current: portfolioSidebarCurrent(pathname),
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <MarketingLayoutShell>
        <Outlet />
      </MarketingLayoutShell>
    </PortfolioLayoutWidget>
  );
}
