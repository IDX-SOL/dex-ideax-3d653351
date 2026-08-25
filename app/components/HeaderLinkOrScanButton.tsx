import { useCallback } from "react";
import { useAccount } from "@orderly.network/hooks";
import { useAppContext } from "@orderly.network/react-app";
import { AccountStatusEnum } from "@orderly.network/types";
import { useMediaQuery } from "@orderly.network/ui";
import {
  LinkDevice,
  ScanQRCode,
  useLinkDeviceScript,
  useScanQRCodeScript,
} from "@orderly.network/ui-scaffold";
import { triggerHeaderConnect } from "@/utils/triggerHeaderConnect";

/** Match header nav — tablet/desktop (860px+): QR link device; phone: camera scan. */
const TABLET_HEADER_QUERY = "(min-width: 860px)";

export function HeaderLinkOrScanButton() {
  const tabletUp = useMediaQuery(TABLET_HEADER_QUERY);
  const { state } = useAccount();
  const { connectWallet, disabledConnect } = useAppContext();
  const link = useLinkDeviceScript();
  const scan = useScanQRCodeScript();

  const disconnected =
    disabledConnect || state.status <= AccountStatusEnum.NotConnected;

  const onLinkDeviceClick = useCallback(() => {
    if (disconnected) {
      triggerHeaderConnect(connectWallet);
      return;
    }
    link.showDialog();
  }, [connectWallet, disconnected, link.showDialog]);

  if (tabletUp) {
    return (
      <span className="idx-header-link-device">
        <LinkDevice {...link} showDialog={onLinkDeviceClick} />
      </span>
    );
  }

  return <ScanQRCode {...scan} showScanTooltip={false} />;
}
