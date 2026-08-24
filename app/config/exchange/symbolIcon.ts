const ORDERLY_SYMBOL_BASE = "https://oss.orderly.network/static/symbol_logo";
const ORDERLY_BROKER_SYMBOL_BASE =
  "https://oss.orderly.network/static/broker_symbol_logo";

/** Match @orderly.network/ui TokenIcon URL resolution. */
export function resolveSymbolIconUrls(symbolOrBase: string) {
  const raw = String(symbolOrBase || "");
  const parts = raw.split("_");
  const name = parts.length >= 2 ? parts[1] : raw;
  const brokerId = parts[3]?.trim();
  const symbolUrl = `${ORDERLY_SYMBOL_BASE}/${encodeURIComponent(name)}.png`;

  if (brokerId) {
    const brokerUrl = `${ORDERLY_BROKER_SYMBOL_BASE}/${encodeURIComponent(`${name}_${brokerId}`)}.png`;
    return { primary: brokerUrl, fallback: symbolUrl, label: name };
  }

  return { primary: symbolUrl, fallback: symbolUrl, label: name };
}

export function symbolIconUrl(symbolOrBase: string) {
  return resolveSymbolIconUrls(symbolOrBase).primary;
}
