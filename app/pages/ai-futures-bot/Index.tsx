import BotsList from "@/components/ai-futures-bot/BotsList";
import { AI_FUTURES_BOT_MENU_NAME } from "@/components/ai-futures-bot/constants";
import { usePageSEO } from "@/hooks/usePageSEO";
import { renderSEOTags } from "@/utils/seo-tags";

export default function AiFuturesBotIndex() {
  const { tags, pageTitle } = usePageSEO(AI_FUTURES_BOT_MENU_NAME);

  return (
    <>
      {renderSEOTags(tags, pageTitle)}
      <BotsList />
    </>
  );
}
