import { isMobileUiDevice } from "./device-detection";

const MOBILE_UI_ATTR = "data-idx-mobile-ui";
const MOBILE_VIEWPORT_QUERY = "(max-width: 1023.98px)";

/** Sync html flag for CSS that cannot use iPad device detection in media queries. */
export function applyMobileUiDocumentFlag(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  const sync = () => {
    if (isMobileUiDevice()) {
      root.setAttribute(MOBILE_UI_ATTR, "true");
    } else {
      root.removeAttribute(MOBILE_UI_ATTR);
    }
  };

  sync();

  if (typeof window === "undefined") return;

  const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY);
  const onChange = () => sync();
  mq.addEventListener("change", onChange);
}
