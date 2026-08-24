import { OverviewModule } from "@orderly.network/portfolio";
import { usePortfolioOverviewCardClicks } from "@/hooks/usePortfolioOverviewCardClicks";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioIndex() {
  usePortfolioOverviewCardClicks();
  const { tags, pageTitle } = usePageSEO("Portfolio");

  return (
    <div className="oui-portfolio-page">
      {renderSEOTags(tags, pageTitle)}
      <OverviewModule.OverviewPage />
    </div>
  );
}

