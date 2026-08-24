import { SettingModule } from "@orderly.network/portfolio";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PortfolioSetting() {
  const { tags, pageTitle } = usePageSEO("Setting");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <SettingModule.SettingPage />
    </>
  );
}

