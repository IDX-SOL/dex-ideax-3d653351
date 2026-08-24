import { Helmet } from "react-helmet-async";
import ExchangeHomePage from "@/components/exchange-home/ExchangeHomePage";
import { usePageSEO } from "@/hooks/usePageSEO";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { getHomeStructuredData } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";

export default function HomeIndex() {
  const appName = getRuntimeConfig("VITE_APP_NAME") || "IDX Exchange";
  const { tags, pageTitle } = usePageSEO(appName);

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(getHomeStructuredData())}
        </script>
      </Helmet>
      <ExchangeHomePage />
    </>
  );
}
