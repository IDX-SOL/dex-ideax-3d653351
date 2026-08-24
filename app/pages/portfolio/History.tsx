import { HistoryModule } from "@orderly.network/portfolio";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioHistory() {
  const { tags, pageTitle } = usePageSEO("History");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <div className={"history-page"}>
        <HistoryModule.HistoryPage />
      </div>
    </>
  );
}

