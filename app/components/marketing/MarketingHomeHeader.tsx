import { IdxHeaderBar } from "@/components/IdxHeaderBar";
import { useIdxHeaderNavItems } from "@/hooks/useIdxHeaderNavItems";

/** Marketing home header — no Orderly wallet/chain widgets; Trade → /futures. */
export function MarketingHomeHeader() {
  const { navItems, customMenus } = useIdxHeaderNavItems();

  return (
    <IdxHeaderBar
      components={{}}
      navItems={navItems}
      customMenus={customMenus}
    />
  );
}
