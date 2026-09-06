/** True on marketing home (`/` relative to router basename). */
export function isHomeRoute(pathname: string): boolean {
  const path =
    !pathname || pathname === "/"
      ? "/"
      : pathname.endsWith("/")
        ? pathname.slice(0, -1)
        : pathname;
  return path === "/";
}
