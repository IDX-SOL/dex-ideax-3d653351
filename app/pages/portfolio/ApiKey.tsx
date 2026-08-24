import { useEffect } from "react";
import { APIManagerModule } from "@orderly.network/portfolio";
import { DOCS_EXCHANGE_API_URL } from "@/config/exchange/urls";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

const API_GUIDE_SELECTOR =
  "#portfolio-apikey-manager .oui-border-b-2 .oui-flex-col > .oui-cursor-pointer.oui-text-primary-light";

function bindApiGuideLink() {
  const guide = document.querySelector<HTMLElement>(API_GUIDE_SELECTOR);
  if (!guide || guide.dataset.idxDocsBound === "1") return false;

  guide.dataset.idxDocsBound = "1";
  guide.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.open(DOCS_EXCHANGE_API_URL, "_blank", "noopener,noreferrer");
    },
    true,
  );
  return true;
}

export default function PortfolioApiKey() {
  const { tags, pageTitle } = usePageSEO("API Key");

  useEffect(() => {
    if (bindApiGuideLink()) return;

    const observer = new MutationObserver(() => {
      if (bindApiGuideLink()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <APIManagerModule.APIManagerPage />
    </>
  );
}
