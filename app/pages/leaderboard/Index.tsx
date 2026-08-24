import { GeneralLeaderboardWidget } from "@orderly.network/trading-leaderboard";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function LeaderboardIndex() {
  const { tags, pageTitle } = usePageSEO("Leaderboard");

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <div className="oui-py-6 oui-px-4 lg:oui-px-6 xl:oui-pl-4 lx:oui-pr-6">
        <GeneralLeaderboardWidget />
      </div>
    </>
  );
}

