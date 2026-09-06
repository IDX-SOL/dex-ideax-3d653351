import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@orderly.network/ui";

type NavItem = {
  name: string;
  href: string;
  target?: string;
};

/** Mobile nav for marketing home — no Orderly wallet / scan hooks. */
export function MarketingMobileNav({
  navItems,
  customMenus,
}: {
  navItems: NavItem[];
  customMenus: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="oui-inline-flex oui-items-center oui-justify-center oui-text-base-contrast-80"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{ zoom: 1.2 }}
      >
        <Menu size={20} strokeWidth={2.25} />
      </button>

      {open ? (
        <div
          className="idx-marketing-mobile-nav-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "idx-marketing-mobile-nav",
          open && "idx-marketing-mobile-nav--open",
        )}
        aria-hidden={!open}
      >
        <div className="idx-marketing-mobile-nav__head">
          <span className="idx-marketing-mobile-nav__title">Menu</span>
          <button
            type="button"
            className="idx-marketing-mobile-nav__close"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="idx-marketing-mobile-nav__links" aria-label="Primary">
          {navItems.map((item) =>
            item.target === "_blank" ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
              >
                {item.name}
              </Link>
            ),
          )}
          {customMenus.map((item) => (
            <a
              key={`${item.name}-${item.href}`}
              href={item.href}
              target={item.target ?? "_blank"}
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
