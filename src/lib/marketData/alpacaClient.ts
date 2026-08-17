import { fetchJsonCoalesced } from "./clientRequestCoalescer";
import { closeProviderOperationalGap, openProviderOperationalGap } from "./operationalGapReporter";

const CRYPTO_SYMBOLS = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "MATIC", "UNI", "ATOM"]);
const ETF_SYMBOLS = new Set(["SPY", "QQQ", "IWM", "DIA", "VTI", "VOO", "GLD", "SLV", "USO", "TLT"]);

function alpacaAssetClass(symbol: string): "crypto" | "equity" | "etf" {
  if (CRYPTO_SYMBOLS.has(symbol)) return "crypto";
  if (ETF_SYMBOLS.has(symbol)) return "etf";
  return "equity";
}

async function reportAlpacaResult(
  normalized: string,
  channel: "quote" | "bar" | "trade",
  result: any,
) {
  const assetClass = alpacaAssetClass(normalized);
  if (result?.providerHealth && result.providerHealth !== "HEALTHY") {
    await openProviderOperationalGap(
      normalized, "alpaca-rest", assetClass, channel, "RATE_LIMIT", Date.now(),
      Number.isFinite(result.retryAfterMs) ? result.retryAfterMs : null,
      `Alpaca ${channel} continuity is ${result.providerHealth}; missing observations are not reconstructed.`,
    );
  } else {
    await closeProviderOperationalGap(
      normalized, "alpaca-rest", assetClass, channel, "RATE_LIMIT", Date.now(),
    );
  }
}

async function reportAlpacaFailure(
  normalized: string,
  channel: "quote" | "bar" | "trade",
  error: unknown,
) {
  if ((error as { status?: number })?.status !== 429) return;
  const retryAfterMs = (error as { body?: { retryAfterMs?: unknown } })?.body?.retryAfterMs;
  await openProviderOperationalGap(
    normalized, "alpaca-rest", alpacaAssetClass(normalized), channel,
    "RATE_LIMIT", Date.now(), Number.isFinite(retryAfterMs) ? Number(retryAfterMs) : null,
    `Alpaca ${channel} collection was rate-limited; coverage is partial until healthy observations resume.`,
  );
}

export async function fetchAlpacaQuote<T = any>(
  symbol: string,
  consumer: string,
  ttlMs: number,
): Promise<T> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const result = await fetchJsonCoalesced<any>(
      `/api/alpaca?sym=${encodeURIComponent(normalized)}&type=quote&consumer=${encodeURIComponent(consumer)}`,
      ttlMs,
      `alpaca:quote:${normalized}`,
    );
    await reportAlpacaResult(normalized, "quote", result);
    return result as T;
  } catch (error) {
    await reportAlpacaFailure(normalized, "quote", error);
    throw error;
  }
}

export async function fetchAlpacaCandles<T = any>(
  symbol: string,
  timeframe: string,
  bars: number,
  consumer: string,
): Promise<T> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const result = await fetchJsonCoalesced<any>(
      `/api/alpaca?sym=${encodeURIComponent(normalized)}&type=candles&tf=${encodeURIComponent(timeframe)}&bars=${bars}&consumer=${encodeURIComponent(consumer)}`,
      20_000,
      `alpaca:candles:${normalized}:${timeframe}:${bars}`,
    );
    await reportAlpacaResult(normalized, "bar", result);
    return result as T;
  } catch (error) {
    await reportAlpacaFailure(normalized, "bar", error);
    throw error;
  }
}

export async function fetchAlpacaTrades<T = any>(
  symbol: string,
  since: number,
  consumer: string,
): Promise<T> {
  const normalized = symbol.trim().toUpperCase();
  try {
    const result = await fetchJsonCoalesced<any>(
      `/api/alpaca?sym=${encodeURIComponent(normalized)}&type=trades&since=${since}&consumer=${encodeURIComponent(consumer)}`,
      900,
      `alpaca:trades:${normalized}:${since}`,
    );
    await reportAlpacaResult(normalized, "trade", result);
    return result as T;
  } catch (error) {
    await reportAlpacaFailure(normalized, "trade", error);
    throw error;
  }
}
