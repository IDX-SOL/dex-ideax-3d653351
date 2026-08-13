import BotTheater from "@/components/ai-futures-bot/BotTheater";
import { AI_FUTURES_BOT_MENU_NAME } from "@/components/ai-futures-bot/constants";
import { getPageMeta } from "@/utils/seo";
import { renderSEOTags } from "@/utils/seo-tags";
import { generatePageTitle } from "@/utils/utils";

export default function AiFuturesBotDetail() {
  const pageMeta = getPageMeta();
  const pageTitle = generatePageTitle(AI_FUTURES_BOT_MENU_NAME);

  return (
    <>
      {renderSEOTags(pageMeta, pageTitle)}
      <BotTheater />
    </>
  );
}
