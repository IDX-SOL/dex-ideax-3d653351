import { useNavigate } from "react-router-dom";
import { MarketsHomePage } from "@orderly.network/markets";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
} from "@/utils/runtime-config";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { updateSymbol } from "@/utils/storage";
import { generatePageTitle } from "@/utils/utils";

export default function MarketsIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Markets");
  const navigate = useNavigate();

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <MarketsHomePage
        comparisonProps={{
          exchangesIconSrc: getRuntimeConfigBoolean("VITE_HAS_SECONDARY_LOGO")
            ? "/logo-secondary.webp"
            : undefined,
          exchangesName: getRuntimeConfig("VITE_ORDERLY_BROKER_NAME"),
        }}
        onSymbolChange={(symbol) => {
          updateSymbol(symbol.symbol);
          navigate("/");
        }}
      />
    </>
  );
}
