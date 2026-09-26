/**
 * WHICH COINBASE PRODUCT A SYMBOL IS — moved out of useWebSocket.ts on
 * 2026-09-26 (Garden 16 §26), unchanged.
 *
 * The same answer picks the live tape's venue (useWebSocket) and the chart's
 * FIRST bar route (MainChart: "one venue for bars and tape"), and now the
 * timeframe ladder's per-symbol availability too. A hook module is the wrong
 * home for a fact three readers need, and a copy is how two of them disagree.
 *
 * Keyed by the identity layer's crypto base (`cryptoBaseTicker`), exactly as
 * the tape read it: BTC, BTCUSD, BTC-USD and BTC.COINBASE are one instrument.
 */
import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

const COINBASE_PRODUCT: Readonly<Record<string, string>> = {
  BTC: "BTC-USD", ETH: "ETH-USD", SOL: "SOL-USD", BNB: "BNB-USD",
  XRP: "XRP-USD", DOGE: "DOGE-USD", ADA: "ADA-USD", AVAX: "AVAX-USD",
  LINK: "LINK-USD", DOT: "DOT-USD", LTC: "LTC-USD", ATOM: "ATOM-USD",
  UNI: "UNI-USD", MATIC: "MATIC-USD", BTCUSD: "BTC-USD", ETHUSD: "ETH-USD",
  SOLUSD: "SOL-USD",
};

export function coinbaseProduct(symbol: string): string | null {
  return COINBASE_PRODUCT[cryptoBaseTicker(symbol) ?? symbol.toUpperCase()] ?? null;
}
