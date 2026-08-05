/** iPad / iPadOS (includes Pro, all orientations). Excludes Mac laptops. */
export function isIPadTablet(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;

  // iPadOS 13+ reports as MacIntel with touch points.
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/**
 * Match Orderly max2XL / compact desktop (and below).
 * ≥1280px stays full desktop trading layout.
 */
export const MOBILE_VIEWPORT_QUERY = "(max-width: 1279.98px)";

/** Phone, iPad, or narrow desktop — mobile trading / wallet UI. */
export function isMobileUiDevice(): boolean {
  if (isIPadTablet()) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_VIEWPORT_QUERY).matches;
}
