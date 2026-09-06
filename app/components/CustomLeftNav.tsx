import { FC, useCallback } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useAccount } from "@orderly.network/hooks";
import { useTranslation } from "@orderly.network/i18n";
import { AccountStatusEnum } from "@orderly.network/types";
import {
  Sheet,
  SheetContent,
  modal,
  useModal,
  VectorIcon,
} from "@orderly.network/ui";
import {
  LanguageSwitcher,
  LeftNavProps,
  LeftNavItem,
  ScanQRCode,
  SubAccountWidget,
  useLanguageSwitcherScript,
  useScanQRCodeScript,
} from "@orderly.network/ui-scaffold";
import { IdxFooterCreditLink } from "@/components/IdxFooterCreditLink";
import { withBasePath } from "@/utils/base-path";
import {
  getRuntimeConfig,
  getRuntimeConfigBoolean,
} from "@/utils/runtime-config";

type LeftNavUIProps = LeftNavProps & {
  className?: string;
  logo?: {
    src: string;
    alt: string;
  };
  externalLinks?: Array<{
    name: string;
    href: string;
    target?: string;
  }>;
  /** Home marketing header — hide scan / account chrome in drawer footer. */
  hideWalletActions?: boolean;
  /** Cold home load — language row needs Orderly analytics hooks. */
  hideLanguageSwitcher?: boolean;
};

const navRowClassName =
  "oui-flex oui-w-full oui-cursor-pointer oui-items-center oui-justify-between oui-border-none oui-bg-transparent oui-px-3 oui-py-4 hover:oui-bg-base-7";

const LeftNavUI: FC<LeftNavUIProps> = (props) => {
  const showModal = useCallback(() => {
    modal.show(LeftNavSheet, {
      ...props,
    });
  }, [props]);

  return (
    <button
      onClick={showModal}
      className={props?.className}
      aria-label="Open navigation menu"
      style={{
        zoom: "1.2",
      }}
    >
      <VectorIcon />
    </button>
  );
};

const LeftNavSheet = modal.create<LeftNavUIProps>((props) => {
  const { visible, hide, onOpenChange } = useModal();

  return (
    <Sheet open={visible} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="oui-w-[276px] oui-bg-base-8"
        closeable
        closeableSize={24}
        closeOpacity={0.54}
      >
        <div className="oui-relative oui-flex oui-h-full oui-flex-col oui-gap-3">
          <div className="oui-mt-[6px] oui-flex oui-h-[44px] oui-shrink-0 oui-items-center">
            <Link
              to="/"
              onClick={hide}
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
            {Array.isArray(props?.menus) && props.menus.length > 0 && (
              <>
                {props.menus?.map((item) => (
                  <NavItem
                    item={item}
                    key={`item-${item.name}`}
                    onLinkClick={hide}
                  />
                ))}
              </>
            )}

            {Array.isArray(props?.externalLinks) &&
              props.externalLinks.length > 0 && (
                <>
                  <div className="oui-w-full oui-border-t oui-border-line-12 oui-my-2 oui-bg-base-3"></div>
                  {props.externalLinks?.map((item) => (
                    <ExternalNavItem
                      item={item}
                      key={`external-${item.name}`}
                    />
                  ))}
                </>
              )}

            {!props.hideLanguageSwitcher ? (
              <>
                <div className="oui-w-full oui-border-t oui-border-line-12 oui-my-2" />
                <LanguageNavItem />
              </>
            ) : null}
          </div>

          <BottomAccountActions
            hideWalletActions={props.hideWalletActions}
            onClose={hide}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
});

const LanguageNavItem: FC = () => {
  const { t } = useTranslation();
  const state = useLanguageSwitcherScript({ popup: { mode: "sheet" } });

  if (state.languages.length <= 1) {
    return null;
  }

  const selected = state.languages.find(
    (lang) => lang.localCode === state.selectedLang,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => state.onOpenChange(true)}
        className={navRowClassName}
      >
        <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
          {t("languageSwitcher.language")}
        </div>
        <div className="oui-text-sm oui-font-semibold oui-text-base-contrast-54">
          {selected?.displayName ?? state.selectedLang}
        </div>
      </button>
      <div className="idx-mobile-lang-switcher" aria-hidden>
        <LanguageSwitcher {...state} />
      </div>
    </>
  );
};

const NavMenuFooterCredit: FC = () => (
  <div className="oui-border-t oui-border-line-12">
    <div className="idx-mobile-nav-by-wrap">
      <IdxFooterCreditLink className="idx-mobile-nav-by" />
    </div>
  </div>
);

const NavMenuFooter: FC = () => (
  <div className="oui-mt-auto oui-w-full oui-shrink-0 oui-flex oui-flex-col">
    <NavMenuFooterCredit />
  </div>
);

const WalletBottomAccountActions: FC<{ onClose?: () => void }> = ({
  onClose,
}) => {
  const { t } = useTranslation();
  const { state } = useAccount();
  const scan = useScanQRCodeScript();

  const showScan = state.status === AccountStatusEnum.NotConnected;
  const showSwitch = state.status >= AccountStatusEnum.EnableTrading;

  return (
    <div className="oui-mt-auto oui-w-full oui-shrink-0 oui-flex oui-flex-col">
      {showScan && (
        <>
          <button
            type="button"
            onClick={scan.showDialog}
            className={navRowClassName}
          >
            <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
              {t("linkDevice.scanQRCode")}
            </div>
          </button>
          <div className="idx-mobile-scan-qr" aria-hidden>
            <ScanQRCode {...scan} showScanTooltip={false} />
          </div>
        </>
      )}
      {showSwitch && (
        <div className="idx-mobile-account-nav oui-w-full">
          <SubAccountWidget
            customTrigger={
              <div className={navRowClassName}>
                <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
                  {t("subAccount.modal.title")}
                </div>
              </div>
            }
          />
        </div>
      )}
      <NavMenuFooterCredit />
    </div>
  );
};

const BottomAccountActions: FC<{
  hideWalletActions?: boolean;
  onClose?: () => void;
}> = ({ hideWalletActions, onClose }) => {
  if (hideWalletActions) {
    return <NavMenuFooter />;
  }

  return <WalletBottomAccountActions onClose={onClose} />;
};

type NavItemProps = {
  item: LeftNavItem;
  onLinkClick?: () => void;
};

const NavItem: FC<NavItemProps> = ({ item, onLinkClick }) => {
  const { href, name, icon, trailing, customRender, target } = item;

  if (customRender) {
    return (
      <button
        type="button"
        onClick={onLinkClick}
        className="oui-flex oui-items-center oui-px-3 oui-py-4 oui-w-full hover:oui-bg-base-7 oui-bg-transparent oui-border-none"
      >
        {customRender({ name, href })}
      </button>
    );
  }

  const content = (
    <>
      <div>{icon}</div>
      <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
        {name}
      </div>
      {trailing}
    </>
  );

  if (target) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={onLinkClick}
        className="oui-flex oui-items-center oui-px-3 oui-py-4 oui-w-full hover:oui-bg-base-7 oui-no-underline"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={href}
      onClick={onLinkClick}
      className="oui-flex oui-items-center oui-px-3 oui-py-4 oui-w-full hover:oui-bg-base-7 oui-no-underline"
    >
      {content}
    </Link>
  );
};

type ExternalNavItemProps = {
  item: {
    name: string;
    href: string;
    target?: string;
  };
};

const ExternalNavItem: FC<ExternalNavItemProps> = ({ item }) => {
  return (
    <a
      href={item.href}
      target={item.target || "_blank"}
      rel="noopener noreferrer"
      className="oui-flex oui-items-center oui-justify-between oui-px-3 oui-py-4 oui-w-full hover:oui-bg-base-7 oui-no-underline"
    >
      <div className="oui-text-base oui-font-semibold oui-text-base-contrast-80">
        {item.name}
      </div>
      <ExternalLink className="oui-w-4 oui-h-4 oui-text-base-contrast-54 oui-flex-shrink-0" />
    </a>
  );
};

export default LeftNavUI;
