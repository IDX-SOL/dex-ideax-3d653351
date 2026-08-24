import { FeeTierModule } from "@orderly.network/portfolio";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioFee() {
  const { tags, pageTitle } = usePageSEO("Fee");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <FeeTierModule.FeeTierPage dataAdapter={() => ({
        columns: [],
        dataSource: [],
      })} />
    </>
  );
}

