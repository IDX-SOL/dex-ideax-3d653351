import { Outlet, useLocation } from "react-router-dom";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

export default function RewardsLayout() {
  const { onRouteChange } = useNav();
  const config = useOrderlyConfig();
  const { pathname } = useLocation();

  return (
    <Scaffold
      classNames={{
        content: "lg:oui-mb-0",
        topNavbar: "oui-bg-base-9",
      }}
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        // Show mobile sub-header (back arrow) on /rewards/affiliate.
        // initialMenu is where back navigates; "/" avoids /rewards → affiliate loop.
        current: pathname,
        initialMenu: "/",
      }}
      footerProps={config.scaffold.footerProps}
      routerAdapter={{
        onRouteChange,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      <Outlet />
    </Scaffold>
  );
}
