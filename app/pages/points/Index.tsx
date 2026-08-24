import { useNavigate } from "react-router-dom";
import { PointSystemPage } from "@orderly.network/trading-points";
import { RouteOption } from "@orderly.network/types";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function PointsIndex() {
  const { tags, pageTitle } = usePageSEO("Points");
  const navigate = useNavigate();

  const onRouteChange = (pathObject: RouteOption) => {
    const path = pathObject.href;
    if (path && (path === "/perp" || path === "/" || path === "/futures")) {
      navigate("/futures");
    }
  };

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <PointSystemPage onRouteChange={onRouteChange} />
    </>
  );
}
