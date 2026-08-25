/**
 * Export LinkDevice + useLinkDeviceScript from @orderly.network/ui-scaffold
 * (LinkDeviceWidget renders mobile UI below 1280px — not QR on tablet/laptop).
 * Idempotent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ESM_MARKER = "LinkDevice, useLinkDeviceScript, useLanguageSwitcherScript";

const ESM_FROM =
  "export { AccountMenuWidget, AccountSummaryWidget, BottomNav, BottomNavWidget, CampaignPositionEnum, ChainMenu, ChainMenuWidget, Footer, FooterWidget, LanguageSwitcher, LanguageSwitcherWidget, LeftNavUI, LeftNavWidget, MainLogo, MainNavMobile, MainNavWidget, MaintenanceTipsUI, MaintenanceTipsWidget, RestrictedInfo, RestrictedInfoWidget, Scaffold, ScaffoldContext, ScanQRCode, ScanQRCodeWidget, SideBar, SideNavbarWidget, SubAccountScript, SubAccountUI, SubAccountWidget, useLanguageSwitcherScript, useRestrictedInfoScript, useScaffoldContext, useScanQRCodeScript };";

const ESM_TO =
  "export { AccountMenuWidget, AccountSummaryWidget, BottomNav, BottomNavWidget, CampaignPositionEnum, ChainMenu, ChainMenuWidget, Footer, FooterWidget, LanguageSwitcher, LanguageSwitcherWidget, LeftNavUI, LeftNavWidget, LinkDevice, LinkDeviceWidget, MainLogo, MainNavMobile, MainNavWidget, MaintenanceTipsUI, MaintenanceTipsWidget, RestrictedInfo, RestrictedInfoWidget, Scaffold, ScaffoldContext, ScanQRCode, ScanQRCodeWidget, SideBar, SideNavbarWidget, SubAccountScript, SubAccountUI, SubAccountWidget, useLanguageSwitcherScript, useLinkDeviceScript, useRestrictedInfoScript, useScaffoldContext, useScanQRCodeScript };";

/** Legacy export line (LinkDeviceWidget only). */
const ESM_LEGACY =
  "export { AccountMenuWidget, AccountSummaryWidget, BottomNav, BottomNavWidget, CampaignPositionEnum, ChainMenu, ChainMenuWidget, Footer, FooterWidget, LanguageSwitcher, LanguageSwitcherWidget, LeftNavUI, LeftNavWidget, LinkDeviceWidget, MainLogo, MainNavMobile, MainNavWidget, MaintenanceTipsUI, MaintenanceTipsWidget, RestrictedInfo, RestrictedInfoWidget, Scaffold, ScaffoldContext, ScanQRCode, ScanQRCodeWidget, SideBar, SideNavbarWidget, SubAccountScript, SubAccountUI, SubAccountWidget, useLanguageSwitcherScript, useRestrictedInfoScript, useScaffoldContext, useScanQRCodeScript };";

const CJS_MARKER = "exports.useLinkDeviceScript = useLinkDeviceScript;";

function patchEsm(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", path.relative(root, filePath));
    return false;
  }
  const before = fs.readFileSync(filePath, "utf8");
  if (before.includes(ESM_MARKER)) {
    console.log("unchanged", path.relative(root, filePath));
    return false;
  }
  if (before.includes(ESM_FROM)) {
    fs.writeFileSync(filePath, before.replace(ESM_FROM, ESM_TO));
    console.log("patched", path.relative(root, filePath));
    return true;
  }
  if (before.includes(ESM_LEGACY)) {
    fs.writeFileSync(filePath, before.replace(ESM_LEGACY, ESM_TO));
    console.log("patched legacy", path.relative(root, filePath));
    return true;
  }
  console.error("FAILED: ESM export block not found", path.relative(root, filePath));
  return false;
}

function patchCjs(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn("skip missing", path.relative(root, filePath));
    return false;
  }
  const before = fs.readFileSync(filePath, "utf8");
  if (before.includes(CJS_MARKER)) {
    console.log("unchanged", path.relative(root, filePath));
    return false;
  }
  const insert =
    "exports.LinkDevice = LinkDevice;\nexports.LinkDeviceWidget = LinkDeviceWidget;\nexports.useLinkDeviceScript = useLinkDeviceScript;";
  if (!before.includes("exports.LeftNavWidget = LeftNavWidget;")) {
    console.error("FAILED: CJS export block not found", path.relative(root, filePath));
    return false;
  }
  let next = before;
  if (!before.includes("exports.LinkDeviceWidget = LinkDeviceWidget;")) {
    next = next.replace(
      "exports.LeftNavWidget = LeftNavWidget;",
      `exports.LeftNavWidget = LeftNavWidget;\n${insert}`,
    );
  } else if (!before.includes("exports.LinkDevice = LinkDevice;")) {
    next = next.replace(
      "exports.LinkDeviceWidget = LinkDeviceWidget;",
      "exports.LinkDevice = LinkDevice;\nexports.LinkDeviceWidget = LinkDeviceWidget;\nexports.useLinkDeviceScript = useLinkDeviceScript;",
    );
  }
  if (next === before) {
    console.log("unchanged", path.relative(root, filePath));
    return false;
  }
  fs.writeFileSync(filePath, next);
  console.log("patched", path.relative(root, filePath));
  return true;
}

let changed = 0;
if (patchEsm(path.join(root, "node_modules/@orderly.network/ui-scaffold/dist/index.mjs")))
  changed += 1;
if (patchCjs(path.join(root, "node_modules/@orderly.network/ui-scaffold/dist/index.js")))
  changed += 1;

console.log(`link device export patch done (${changed} files updated)`);
