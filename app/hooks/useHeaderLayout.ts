import { useMediaQuery, useScreen } from "@orderly.network/ui";

/** Match exchange-home tablet breakpoint — show full header nav from 860px up. */
const TABLET_HEADER_QUERY = "(min-width: 860px)";

export function useHeaderLayout() {
  const { isMobile } = useScreen();
  const tabletUp = useMediaQuery(TABLET_HEADER_QUERY);

  return {
    isMobile,
    /** Phone-only: hamburger + compact header */
    useCompactHeader: isMobile && !tabletUp,
    /** Tablet + desktop: logo, inline nav, full header controls */
    useDesktopHeader: !isMobile || tabletUp,
  };
}
