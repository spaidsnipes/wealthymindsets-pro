import { fetchJsonCoalesced } from "./clientRequestCoalescer";
import { recordSessionNectarOperationalGap } from "./sessionNectar";

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
    if (result?.providerHealth && result.providerHealth !== "HEALTHY") {
      recordSessionNectarOperationalGap(
        normalized, normalized, "alpaca-rest", "quote", Date.now(),
        `Alpaca quote continuity is ${result.providerHealth}; stale evidence may be displayed but missing observations are not reconstructed.`,
      );
    }
    return result as T;
  } catch (error) {
    if ((error as { status?: number })?.status === 429) {
      recordSessionNectarOperationalGap(
        normalized, normalized, "alpaca-rest", "quote", Date.now(),
        "Alpaca quote collection was rate-limited; coverage is partial until healthy observations resume.",
      );
    }
    throw error;
  }
}
