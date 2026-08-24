import { Outlet } from "react-router-dom";
import { Scaffold } from "@orderly.network/ui-scaffold";
import { AI_FUTURES_BOT_PATH } from "@/components/ai-futures-bot/constants";
import { HiddenScaffoldFooter } from "@/components/HiddenScaffoldFooter";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";
import { useNav } from "@/hooks/useNav";
import { useOrderlyConfig } from "@/utils/config";

export default function AiFuturesBotLayout() {
  const config = useOrderlyConfig();
  const { onRouteChange } = useNav();

  return (
    <Scaffold
      mainNavProps={{
        ...config.scaffold.mainNavProps,
        initialMenu: AI_FUTURES_BOT_PATH,
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
