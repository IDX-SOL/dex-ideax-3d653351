import { Outlet, useLocation } from "react-router-dom";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

export default function MarketsLayout() {
  const { pathname } = useLocation();
  const config = useOrderlyConfig();
  const { onRouteChange } = useNav();

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: "/markets",
        current: pathname,
      }}
      footer={<HiddenScaffoldFooter />}
      routerAdapter={{
        onRouteChange,
        currentPath: pathname,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <MarketingLayoutShell>
        <Outlet />
      </MarketingLayoutShell>
    </Scaffold>
  );
}
