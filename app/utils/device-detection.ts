/** iPad / iPadOS (includes Pro, all orientations). Excludes Mac laptops. */
export function isIPadTablet(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;

  // iPadOS 13+ reports as MacIntel with touch points.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

const MOBILE_VIEWPORT_QUERY = "(max-width: 1023.98px)";

/** Phone-sized viewport or iPad — mobile trading / wallet UI. */
export function isMobileUiDevice(): boolean {
  if (isIPadTablet()) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}
