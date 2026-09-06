import { useMemo } from "react";
import { DOCS_EXCHANGE_URL } from "@/config/exchange/urls";
import { useOrderlyConfig, getCustomMenuItems } from "@/utils/config";

export function useIdxHeaderNavItems() {
  const config = useOrderlyConfig();
  const customMenus = getCustomMenuItems();

  const navItems = useMemo(() => {
    const mainMenus = config.scaffold.mainNavProps.mainMenus ?? [];
    return [
      ...mainMenus
        .filter(
          (menu) =>
            menu.href && menu.href !== "/" && menu.target !== "_blank",
        )
        .map((menu) => ({
          name: String(menu.name),
          href: menu.href!,
          target: menu.target,
        })),
      { name: "Docs", href: DOCS_EXCHANGE_URL, target: "_blank" },
    ];
  }, [config.scaffold.mainNavProps.mainMenus]);

  return { navItems, customMenus };
}
