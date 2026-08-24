import { useNavigate } from "react-router-dom";
import { MarketsHomePage } from "@orderly.network/markets";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
} from "@/utils/runtime-config";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";
import { updateSymbol } from "@/utils/storage";

export default function MarketsIndex() {
  const { tags, pageTitle } = usePageSEO("Markets");
  const navigate = useNavigate();

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <MarketsHomePage
        comparisonProps={{
          exchangesIconSrc: getRuntimeConfigBoolean("VITE_HAS_SECONDARY_LOGO")
            ? "/logo-secondary.webp"
            : undefined,
          exchangesName: getRuntimeConfig("VITE_ORDERLY_BROKER_NAME"),
        }}
        onSymbolChange={(symbol) => {
          updateSymbol(symbol.symbol);
          navigate("/futures");
        }}
      />
    </>
  );
}
