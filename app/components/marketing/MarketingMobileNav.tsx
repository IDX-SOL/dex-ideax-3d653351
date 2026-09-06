import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, X } from "lucide-react";
import { IdxFooterCreditLink } from "@/components/IdxFooterCreditLink";
import { withBasePath } from "@/utils/base-path";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
} from "@/utils/runtime-config";

type NavItem = {
  name: string;
  href: string;
  target?: string;
};

const navRowClassName =
  "oui-flex oui-w-full oui-cursor-pointer oui-items-center oui-border-none oui-bg-transparent oui-px-3 oui-py-4 hover:oui-bg-base-7 oui-no-underline";

function VectorMenuIcon() {
  return (
    <svg
      width="20"
      height="13"
      viewBox="0 0 20 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0.999023 0.103516C0.447023 0.103516 -0.000976562 0.551516 -0.000976562 1.10352C-0.000976562 1.65552 0.447023 2.10352 0.999023 2.10352H18.999C19.551 2.10352 19.999 1.65552 19.999 1.10352C19.999 0.551516 19.551 0.103516 18.999 0.103516H0.999023ZM0.999023 5.10352C0.447023 5.10352 -0.000976562 5.55152 -0.000976562 6.10352C-0.000976562 6.65552 0.447023 7.10352 0.999023 7.10352H18.999C19.551 7.10352 19.999 6.65552 19.999 6.10352C19.999 5.55152 19.551 5.10352 18.999 5.10352H0.999023ZM0.999023 10.1035C0.447023 10.1035 -0.000976562 10.5515 -0.000976562 11.1035C-0.000976562 11.6555 0.447023 12.1035 0.999023 12.1035H18.999C19.551 12.1035 19.999 11.6555 19.999 11.1035C19.999 10.5515 19.551 10.1035 18.999 10.1035H0.999023Z"
        className="oui-fill-base-contrast-80"
      />
    </svg>
  );
}

/** Cold home mobile nav — futures drawer look, no Orderly hooks. */
export function MarketingMobileNav({
  navItems,
  customMenus,
}: {
  navItems: NavItem[];
  customMenus: NavItem[];
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  const sheet = open ? (
    <>
      <div
        className="idx-cold-home-nav-backdrop"
        role="presentation"
        onClick={close}
      />
      <aside
        className="idx-cold-home-nav-sheet oui-px-4"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          type="button"
          className="idx-cold-home-nav-close"
          aria-label="Close navigation menu"
          onClick={close}
        >
          <X size={24} strokeWidth={2} />
        </button>

        <div className="oui-relative oui-flex oui-h-full oui-flex-col oui-gap-3">
          <div className="oui-mt-[6px] oui-flex oui-h-[44px] oui-shrink-0 oui-items-center">
            <Link
              to="/"
              onClick={close}
              className="oui-flex oui-items-center oui-no-underline"
            >
              {getRuntimeConfigBoolean("VITE_HAS_PRIMARY_LOGO") ? (
                <img
                  src={withBasePath("/logo.webp")}
                  alt="logo"
                  className="oui-h-[32px]"
                />
              ) : (
                <h1 className="oui-text-base-contrast-80 oui-font-bold">
                  {getRuntimeConfig("VITE_ORDERLY_BROKER_NAME")}
                </h1>
              )}
            </Link>
          </div>

          <div className="oui-flex oui-min-h-0 oui-flex-1 oui-flex-col oui-items-start oui-overflow-y-auto">
            {navItems.map((item) =>
              item.target === "_blank" ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className={`${navRowClassName} oui-justify-between`}
                >
                  <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
                    {item.name}
                  </div>
                  <ExternalLink className="oui-w-4 oui-h-4 oui-text-base-contrast-54 oui-flex-shrink-0" />
                </a>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={close}
                  className={navRowClassName}
                >
                  <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
                    {item.name}
                  </div>
                </Link>
              ),
            )}

            {customMenus.length > 0 ? (
              <>
                <div className="oui-w-full oui-border-t oui-border-line-12 oui-my-2 oui-bg-base-3" />
                {customMenus.map((item) => (
                  <a
                    key={`${item.name}-${item.href}`}
                    href={item.href}
                    target={item.target ?? "_blank"}
                    rel="noopener noreferrer"
                    onClick={close}
                    className={`${navRowClassName} oui-justify-between`}
                  >
                    <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
                      {item.name}
                    </div>
                    <ExternalLink className="oui-w-4 oui-h-4 oui-text-base-contrast-54 oui-flex-shrink-0" />
                  </a>
                ))}
              </>
            ) : null}
          </div>

          <div className="oui-mt-auto oui-w-full oui-shrink-0 oui-flex oui-flex-col">
            <div className="oui-border-t oui-border-line-12">
              <div className="idx-mobile-nav-by-wrap">
                <IdxFooterCreditLink className="idx-mobile-nav-by" />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="oui-inline-flex oui-items-center oui-justify-center oui-text-base-contrast-80 oui-border-none oui-bg-transparent"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{ zoom: 1.2 }}
      >
        <VectorMenuIcon />
      </button>
      {sheet && typeof document !== "undefined"
        ? createPortal(sheet, document.body)
        : null}
    </>
  );
}
