import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const WooFiWidget = lazy(() => import("@/components/WooFiWidget"));

export default function SwapIndex() {
  const { tags, pageTitle } = usePageSEO("Swap");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <div className="idx-swap-page w-full max-w-full min-w-0 box-border px-4 py-6">
        <Suspense fallback={<LoadingSpinner />}>
          <WooFiWidget />
        </Suspense>
      </div>
    </>
  );
}

