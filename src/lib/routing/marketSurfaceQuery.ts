import { normalizeTFId, type TFId } from "@/lib/timeframes";

const MARKET_SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.\-!/]{0,14}$/;

/**
 * A market-surface query value may seed canonical state, but it may never
 * bypass the same validation boundary used before persisted symbol state.
 */
export function normalizeMarketSurfaceSymbol(raw: string | null | undefined): string | null {
  const candidate = raw?.trim();
  if (!candidate || !MARKET_SYMBOL_PATTERN.test(candidate)) return null;
  return candidate.toUpperCase();
}

/** Keep URL timeframes inside the canonical chart vocabulary. */
export function normalizeMarketSurfaceTimeframe(raw: string | null | undefined): TFId | null {
  const candidate = raw?.trim();
  if (!candidate) return null;
  return normalizeTFId(candidate);
}

export interface MarketSymbolSeedResolution {
  displaySymbol: string;
  nextSeededSymbol: string | null;
  shouldSeedContext: boolean;
}

/**
 * Resolve the URL-to-context handoff without letting an old query keep owning
 * the market after the trader selects a different symbol.
 */
export function resolveMarketSymbolSeed(
  requestedSymbol: string | null,
  activeSymbol: string | null | undefined,
  seededSymbol: string | null,
): MarketSymbolSeedResolution {
  if (requestedSymbol && requestedSymbol !== seededSymbol) {
    return {
      displaySymbol: requestedSymbol,
      nextSeededSymbol: requestedSymbol,
      shouldSeedContext: true,
    };
  }

  return {
    displaySymbol: activeSymbol || requestedSymbol || "TSLA",
    // Clearing or invalidating the query ends the previous navigation event.
    // Re-adding the same value later must therefore count as a new seed.
    nextSeededSymbol: requestedSymbol ? seededSymbol : null,
    shouldSeedContext: false,
  };
}
