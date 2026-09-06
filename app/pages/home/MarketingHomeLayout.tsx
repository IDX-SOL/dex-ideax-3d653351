import { Outlet } from "react-router-dom";
import { MarketingHomeHeader } from "@/components/marketing/MarketingHomeHeader";
import { MarketingLayoutShell } from "@/components/MarketingLayoutShell";

export default function MarketingHomeLayout() {
  return (
    <div className="oui-scaffold-root idx-marketing-home-shell">
      <header className="oui-scaffold-topNavbar oui-bg-base-9 idx-marketing-home-nav">
        <div className="idx-marketing-home-nav__inner">
          <MarketingHomeHeader />
        </div>
      </header>
      <div className="oui-scaffold-container">
        <MarketingLayoutShell>
          <Outlet />
        </MarketingLayoutShell>
      </div>
    </div>
  );
}
