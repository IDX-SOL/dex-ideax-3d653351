import { Helmet } from "react-helmet-async";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import ExchangeHomePage from "@/components/exchange-home/ExchangeHomePage";
import { getRuntimeConfig } from "@/utils/runtime-config";
import { getHomeStructuredData, getPageMeta } from "@/utils/seo";
import { SEO_HOME_PAGE_TITLE } from "@/utils/seo-routes";
import { renderSEOTags } from "@/utils/seo-tags";

export default function HomeIndex() {
  const pageTitle =
    getRuntimeConfig("VITE_SEO_SITE_NAME") || SEO_HOME_PAGE_TITLE;
  const { pathname } = useLocation();
  const tags = useMemo(
    () => getPageMeta({ pathname, pageTitle }),
    [pathname, pageTitle],
  );

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
