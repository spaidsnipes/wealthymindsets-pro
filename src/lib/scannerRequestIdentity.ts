export const SCANNER_RSI_SYMBOLS = [
  "NQ1!", "ES1!", "NVDA", "TSLA", "AAPL", "META", "AMZN", "MSFT", "GOOG", "AMD",
  "PLTR", "MSTR", "COIN", "SMCI", "ARM", "RIVN", "SOFI", "LCID", "GME", "AMC",
  "SOUN", "AI", "IONQ", "QBTS", "RGTI", "SPY", "QQQ", "IWM", "GLD", "TLT",
] as const;

export type ScannerRsiSymbol = (typeof SCANNER_RSI_SYMBOLS)[number];

export type ScannerRsiIdentity = Readonly<{
  symbol: ScannerRsiSymbol;
  timeframe: "D";
  bars: 40;
  indicator: "rsi14";
  version: "scanner-rsi-v1";
}>;

const scannerSymbolSet = new Set<string>(SCANNER_RSI_SYMBOLS);
const exactIdentityKeys = ["symbol", "timeframe", "bars", "indicator", "version"] as const;

function normalizeScannerSymbol(value: unknown): ScannerRsiSymbol | null {
  if (typeof value !== "string" || /[^\x00-\x7f]/.test(value)) return null;
  const symbol = value.trim().toUpperCase();
  if (!symbol || /\s/.test(symbol) || !scannerSymbolSet.has(symbol)) return null;
  return symbol as ScannerRsiSymbol;
}

export function parseScannerRsiIdentity(value: unknown): ScannerRsiIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== exactIdentityKeys.length ||
      keys.some((key, index) => key !== [...exactIdentityKeys].sort()[index])) return null;
  const symbol = normalizeScannerSymbol(record.symbol);
  if (!symbol || record.timeframe !== "D" || record.bars !== 40 ||
      record.indicator !== "rsi14" || record.version !== "scanner-rsi-v1") return null;
  return Object.freeze({ symbol, timeframe: "D", bars: 40, indicator: "rsi14", version: "scanner-rsi-v1" });
}

export function scannerRsiIdentity(symbol: string): ScannerRsiIdentity {
  const identity = parseScannerRsiIdentity({
    symbol, timeframe: "D", bars: 40, indicator: "rsi14", version: "scanner-rsi-v1",
  });
  if (!identity) throw new TypeError("Invalid Scanner RSI identity");
  return identity;
}

export function serializeScannerRsiIdentity(identity: ScannerRsiIdentity): string {
  return `version=${identity.version}&indicator=${identity.indicator}&symbol=${identity.symbol}&timeframe=${identity.timeframe}&bars=${identity.bars}`;
}

export const scannerRsiIdentityKey = serializeScannerRsiIdentity;

export function compareScannerRsiIdentity(a: ScannerRsiIdentity, b: ScannerRsiIdentity): number {
  return scannerRsiIdentityKey(a).localeCompare(scannerRsiIdentityKey(b), "en");
}

export function scannerRsiIdentityDomToken(identity: ScannerRsiIdentity): string {
  const bytes = new TextEncoder().encode(scannerRsiIdentityKey(identity));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
