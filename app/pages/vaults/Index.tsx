import { VaultsPage as VaultsPageComponent } from "@orderly.network/vaults";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function VaultsIndex() {
  const { tags, pageTitle } = usePageSEO("Vaults");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <VaultsPageComponent />
    </>
  );
}

