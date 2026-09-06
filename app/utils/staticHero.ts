/** Removes the static LCP hero shell from index.html once React home is ready. */
export function removeStaticHero() {
  document.documentElement.classList.remove("idx-static-hero-active");
  document.getElementById("idx-static-hero")?.remove();
}
