import { useMediaQuery } from "@orderly.network/ui";
import {
  LinkDevice,
  ScanQRCode,
  useLinkDeviceScript,
  useScanQRCodeScript,
} from "@orderly.network/ui-scaffold";

/** Match header nav — tablet/desktop (860px+): QR link device; phone: camera scan. */
const TABLET_HEADER_QUERY = "(min-width: 860px)";

export function HeaderLinkOrScanButton() {
  const tabletUp = useMediaQuery(TABLET_HEADER_QUERY);
  const link = useLinkDeviceScript();
  const scan = useScanQRCodeScript();

  if (tabletUp) {
    return (
      <span className="idx-header-link-device">
        <LinkDevice {...link} />
      </span>
    );
  }

  return <ScanQRCode {...scan} showScanTooltip={false} />;
}
