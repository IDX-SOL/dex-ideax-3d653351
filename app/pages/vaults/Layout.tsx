import { Outlet } from "react-router-dom";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

export default function VaultsLayout() {
  const config = useOrderlyConfig();
  const { onRouteChange } = useNav();

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: "/vaults",
      }}
      footer={<HiddenScaffoldFooter />}
      routerAdapter={{
        onRouteChange,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <MarketingLayoutShell>
        <Outlet />
      </MarketingLayoutShell>
    </Scaffold>
  );
}
