/** Opens the scaffold Connect wallet control, or falls back to connectWallet(). */
export function triggerHeaderConnect(connectWallet: () => unknown) {
  const connectBtn = document.querySelector<HTMLButtonElement>(
    '[data-testid="oui-testid-nav-bar-connectWallet-btn"], button.wallet-connect-button',
  );
  if (connectBtn) {
    connectBtn.click();
    return;
  }
  void connectWallet();
}
