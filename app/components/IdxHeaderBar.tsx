import { Link, useLocation } from "react-router-dom";
import { Flex, cn } from "@orderly.network/ui";
import type { ReactNode } from "react";
import CustomLeftNav from "@/components/CustomLeftNav";
import { MarketingMobileNav } from "@/components/marketing/MarketingMobileNav";
import { HeaderLinkOrScanButton } from "@/components/HeaderLinkOrScanButton";
import { HeaderNavLinks } from "@/components/HeaderNavLinks";
import { TradingModeToggle } from "@/components/TradingModeToggle";
import { FUTURES_URL } from "@/config/exchange/urls";
import { useOrderlyBoot } from "@/contexts/OrderlyBootContext";
import { useHeaderLayout } from "@/hooks/useHeaderLayout";
import { withBasePath } from "@/utils/base-path";

type NavItem = {
  name: string;
  href: string;
  target?: string;
};

type IdxHeaderBarProps = {
  components: Record<string, ReactNode>;
  navItems: NavItem[];
  customMenus: NavItem[];
};

export function IdxHeaderBar({
  components,
  navItems,
  customMenus,
}: IdxHeaderBarProps) {
  const location = useLocation();
  const { useCompactHeader, useDesktopHeader } = useHeaderLayout();
  const { isBooted } = useOrderlyBoot();
  const isFuturesPage = location.pathname.startsWith("/futures");
  const isHomePage = location.pathname === "/";
  const useLightMobileNav = isHomePage && !isBooted;
  const mainNav = useDesktopHeader ? <HeaderNavLinks menus={navItems} /> : null;

  return (
    <Flex
      justify="between"
      itemAlign="center"
      className="oui-w-full oui-min-w-0 oui-max-w-full idx-header-bar"
    >
      <Flex
        itemAlign="center"
        className={cn("oui-gap-3", "oui-min-w-0 oui-flex-1 oui-overflow-hidden")}
      >
        {useCompactHeader ? (
          useLightMobileNav ? (
            <MarketingMobileNav
              navItems={navItems}
              customMenus={customMenus}
            />
          ) : (
            <CustomLeftNav
              menus={navItems}
              externalLinks={customMenus}
              hideWalletActions={isHomePage}
            />
          )
        ) : null}
        <Link
          to="/"
          aria-label="IDX Exchange home"
          className={cn(
            "idx-header-brand oui-flex oui-items-center oui-gap-2 oui-shrink-0",
            isFuturesPage && "idx-header-brand--compact",
          )}
        >
          <picture>
            <source
              srcSet={withBasePath("/exchange-home/logo.webp")}
              type="image/webp"
            />
            <img
              src={withBasePath("/exchange-home/logo.png")}
              alt=""
              width={32}
              height={32}
              style={{ display: "block" }}
            />
          </picture>
          <span className="idx-header-brand-title">IDX Exchange</span>
        </Link>
        {mainNav}
      </Flex>

      <Flex itemAlign="center" className="oui-gap-2 oui-shrink-0">
        {isFuturesPage ? <TradingModeToggle /> : null}
        {useDesktopHeader && isFuturesPage && "accountSummary" in components
          ? components.accountSummary
          : null}
        {!isHomePage ? <HeaderLinkOrScanButton /> : null}
        {useDesktopHeader && isFuturesPage && "languageSwitcher" in components
          ? components.languageSwitcher
          : null}
        {useDesktopHeader && isFuturesPage && "subAccount" in components
          ? components.subAccount
          : null}
        {!isHomePage && "chainMenu" in components ? components.chainMenu : null}
        {isHomePage ? (
          <Link
            to={FUTURES_URL}
            className="idx-header-trade-btn oui-button oui-gradient-brand"
          >
            Trade
          </Link>
        ) : "walletConnect" in components ? (
          components.walletConnect
        ) : null}
      </Flex>
    </Flex>
  );
}
