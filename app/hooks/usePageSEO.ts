import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getPageMeta } from "@/utils/seo";
import { generatePageTitle } from "@/utils/utils";

export function usePageSEO(titleSuffix: string) {
  const { pathname } = useLocation();
  const pageTitle = generatePageTitle(titleSuffix);
  const tags = useMemo(
    () => getPageMeta({ pathname, pageTitle }),
    [pathname, pageTitle],
  );

  return { tags, pageTitle };
}
