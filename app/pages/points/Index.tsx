import { useNavigate } from "react-router-dom";
import { PointSystemPage } from "@orderly.network/trading-points";
import { RouteOption } from "@orderly.network/types";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { generatePageTitle } from "@/utils/utils";

export default function PointsIndex() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle("Points");
  const navigate = useNavigate();

  const onRouteChange = (pathObject: RouteOption) => {
    const path = pathObject.href;
    if (path && (path === "/perp" || path === "/")) {
      navigate("/");
    }
  };

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <PointSystemPage onRouteChange={onRouteChange} />
    </>
  );
}
