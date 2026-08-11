import { fetchJsonCoalesced } from "./clientRequestCoalescer";
import { closeProviderOperationalGap, openProviderOperationalGap } from "./operationalGapReporter";

const CRYPTO_SYMBOLS = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "MATIC", "UNI", "ATOM"]);
const ETF_SYMBOLS = new Set(["SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "GLD", "SLV", "USO", "TLT"]);

function alpacaAssetClass(symbol: string): "crypto" | "equity" | "etf" {
  if (CRYPTO_SYMBOLS.has(symbol)) return "crypto";
  if (ETF_SYMBOLS.has(symbol)) return "etf";
  return "equity";
}

export async function fetchAlpacaQuote<T = any>(
  symbol: string,
  consumer: string,
  ttlMs: number,
): Promise<T> {
  const normalized = symbol.trim().toUpperCase();
  const assetClass = alpacaAssetClass(normalized);
  try {
    const result = await fetchJsonCoalesced<any>(
      `/api/alpaca?sym=${encodeURIComponent(normalized)}&type=quote&consumer=${encodeURIComponent(consumer)}`,
      ttlMs,
      `alpaca:quote:${normalized}`,
    );
    if (result?.providerHealth && result.providerHealth !== "HEALTHY") {
      openProviderOperationalGap(
        normalized, "alpaca-rest", assetClass, "quote", "RATE_LIMIT", Date.now(),
        Number.isFinite(result.retryAfterMs) ? result.retryAfterMs : null,
        `Alpaca quote continuity is ${result.providerHealth}; stale evidence may be displayed but missing observations are not reconstructed.`,
      );
    } else {
      closeProviderOperationalGap(
        normalized, "alpaca-rest", assetClass, "quote", "RATE_LIMIT", Date.now(),
      );
    }
    return result as T;
  } catch (error) {
    if ((error as { status?: number })?.status === 429) {
      const retryAfterMs = (error as { body?: { retryAfterMs?: unknown } })?.body?.retryAfterMs;
      openProviderOperationalGap(
        normalized, "alpaca-rest", assetClass, "quote", "RATE_LIMIT", Date.now(),
        Number.isFinite(retryAfterMs) ? Number(retryAfterMs) : null,
        "Alpaca quote collection was rate-limited; coverage is partial until healthy observations resume.",
      );
    }
    throw error;
  }
}
