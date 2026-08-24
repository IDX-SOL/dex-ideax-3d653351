import { Outlet, useLocation } from "react-router-dom";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

/** Rewards is often off VITE_ENABLED_MENUS but sub-routes must match a menu for mobile nav. */
const REWARDS_NAV = { name: "Rewards", href: "/rewards" };

function rewardsSubNavTitle(pathname: string): string | undefined {
  if (pathname.startsWith("/rewards/affiliate")) return "Affiliate";
  return undefined;
}

export default function RewardsLayout() {
  const { onRouteChange } = useNav();
  const config = useOrderlyConfig();
  const { pathname } = useLocation();

  const baseMenus = config.scaffold.mainNavProps.mainMenus ?? [];
  const hasRewardsNav = baseMenus.some((menu) => menu.href === "/rewards");
  const mainMenus = hasRewardsNav
    ? baseMenus
    : [REWARDS_NAV, ...baseMenus];

  const subTitle = rewardsSubNavTitle(pathname);

  return (
    <Scaffold
      classNames={{
        content: "lg:oui-mb-0",
        topNavbar: "oui-bg-base-9",
      }}
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        mainMenus,
        current: pathname,
        initialMenu: "/portfolio",
        ...(subTitle
          ? { subItems: [{ name: subTitle, href: pathname }] }
          : {}),
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
