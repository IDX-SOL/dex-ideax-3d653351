import { Link, useLocation } from "react-router-dom";
import { cn } from "@orderly.network/ui";

type NavItem = {
  name: string;
  href: string;
  target?: string;
};

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  if (href === "/portfolio") {
    return !pathname.startsWith("/portfolio/api-key");
  }
  return true;
}

export function HeaderNavLinks({
  menus,
  className,
}: {
  menus: NavItem[];
  className?: string;
}) {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn("idx-header-nav", className)}
      aria-label="Primary"
    >
      {menus.map((menu) => {
        if (!menu.href) return null;

        if (menu.target === "_blank") {
          return (
            <a
              key={menu.href}
              href={menu.href}
              target="_blank"
              rel="noopener noreferrer"
              className="idx-header-nav-link oui-text-sm oui-font-normal oui-no-underline"
            >
              {menu.name}
            </a>
          );
        }

        const active = isNavItemActive(pathname, menu.href);

        return (
          <Link
            key={menu.href}
            to={menu.href}
            className={cn(
              "idx-header-nav-link oui-text-sm oui-font-normal oui-no-underline",
              active && "idx-header-nav-link--active",
            )}
          >
            {menu.name}
          </Link>
        );
      })}
    </nav>
  );
}
