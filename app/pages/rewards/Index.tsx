import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function RewardsIndex() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tags, pageTitle } = usePageSEO("Rewards");

  useEffect(() => {
    const searchString = searchParams.toString();
    const redirectPath = searchString
      ? `/rewards/affiliate?${searchString}`
      : "/rewards/affiliate";

    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return renderSEOTags(tags, pageTitle);
}
