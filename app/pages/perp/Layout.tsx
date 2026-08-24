import { Outlet, useLocation } from "react-router-dom";
import { useScreen } from "@orderly.network/ui";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

/** Orderly mobile nav requires a matching menu or it shows sub-page back UI only. */
const HOME_MENU = {
  name: "Home",
  href: "/",
  isHomePageInMobile: true,
};

export default function PerpLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const config = useOrderlyConfig();
  const { onRouteChange } = useNav();
  const { isMobile } = useScreen();

  const initialMenu = pathname.startsWith("/futures")
    ? "/futures"
    : pathname === "/"
      ? "/"
      : pathname;

  const isFutures = pathname.startsWith("/futures");

  const mainMenus =
    pathname === "/" && isMobile
      ? [
          HOME_MENU,
          ...(config.scaffold.mainNavProps.mainMenus ?? []),
        ]
      : config.scaffold.mainNavProps.mainMenus;

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu,
        current: pathname,
        mainMenus,
      }}
      footerProps={isFutures ? config.scaffold.footerProps : undefined}
      footer={
        isFutures ? config.scaffold.exchangeFooter : <HiddenScaffoldFooter />
      }
      routerAdapter={{
        onRouteChange,
        currentPath: pathname,
      }}
      bottomNavProps={config.scaffold.bottomNavProps}
    >
      {isFutures ? (
        <Outlet />
      ) : (
        <MarketingLayoutShell>
          <Outlet />
        </MarketingLayoutShell>
      )}
    </Scaffold>
  );
}
