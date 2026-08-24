/** Suppresses Orderly’s default fixed footer bar when we render our own in-page footer. */
export function HiddenScaffoldFooter() {
  return <span className="idx-scaffold-footer-hidden" aria-hidden="true" />;
}
