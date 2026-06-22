/**
 * Per-exchange crypto symbol convention + parsing.
 * Symbol format: <COIN>.<EXCHANGE>  e.g. "BTC.COINBASE", "ETH.BITSTAMP".
 * Plain "BTC" (no suffix) = default crypto (Coinbase WS).
 */

export type Exchange = "coinbase" | "kraken" | "bitstamp" | "binanceus" | "gemini";

export const EXCHANGE_LABEL: Record<Exchange, string> = {
  coinbase:  "Coinbase",
  kraken:    "Kraken",
  bitstamp:  "Bitstamp",
  binanceus: "Binance.US",
  gemini:    "Gemini",
};

const SUFFIX_TO_EX: Record<string, Exchange> = {
  COINBASE: "coinbase", KRAKEN: "kraken", BITSTAMP: "bitstamp",
  BINANCEUS: "binanceus", GEMINI: "gemini",
};

export const EXCHANGES: Exchange[] = ["coinbase", "kraken", "bitstamp", "binanceus", "gemini"];

/** "BTC.COINBASE" → { coin:"BTC", exchange:"coinbase" }; non-exchange symbols → null */
export function parseExchangeSymbol(sym: string): { coin: string; exchange: Exchange } | null {
  const m = sym.toUpperCase().match(/^([A-Z]{2,6})\.(COINBASE|KRAKEN|BITSTAMP|BINANCEUS|GEMINI)$/);
  if (!m) return null;
  return { coin: m[1], exchange: SUFFIX_TO_EX[m[2]] };
}

export function isExchangeSymbol(sym: string): boolean {
  return parseExchangeSymbol(sym) != null;
}

/** Display label e.g. "BTC · Coinbase" */
export function exchangeSymbolLabel(sym: string): string {
  const p = parseExchangeSymbol(sym);
  return p ? `${p.coin} · ${EXCHANGE_LABEL[p.exchange]}` : sym;
}
