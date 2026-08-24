import { AssetsModule } from "@orderly.network/portfolio";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioAssets() {
  const { tags, pageTitle } = usePageSEO("Assets");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <AssetsModule.AssetsPage />
    </>
  );
}

