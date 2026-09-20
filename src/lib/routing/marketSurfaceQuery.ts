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

/**
 * B-201 · THE ROUTE IS A RISER, AND THE URL IS THE AS-BUILT DRAWING.
 *
 * Blueprint B-201 (Route History Stack) draws the route as a riser carrying a
 * non-destructive layered stack — ACTIVE over ALTERNATE over HISTORICAL — each
 * entry stamped with what it was. `/charts` read the riser and never wrote back
 * to it. MEASURED consequence, with a trader in the chair:
 *
 *   1. arrive at /charts?symbol=NVDA
 *   2. click TSLA in the watchlist, switch to 1H
 *   3. the URL still says `?symbol=NVDA` — it now describes a view nobody is
 *      looking at. Copy it to a colleague and you send the wrong instrument.
 *   4. press Back: nothing happens, because no history entry was ever written.
 *
 * This function computes the AS-BUILT query string for the view actually on
 * screen. It returns `null` when the URL already says the truth, so the caller
 * never touches history for a no-op.
 *
 * WHY `replaceState`, NOT `pushState` (the caller's obligation):
 * pushing would make every symbol tap a history entry, so Back would walk the
 * trader's own scrolling around one instrument at a time. `replaceState` keeps
 * ONE entry per arrival and keeps it accurate — the stamp, not the stack.
 *
 * WHY THIS CANNOT BECOME A SECOND OWNER: the values are re-validated through
 * the SAME normalizers the seed path uses, so the URL can only ever spell a
 * symbol/timeframe the seed path would have accepted. Writing back a value the
 * reader would reject is how a round trip silently loses state.
 *
 * Unknown params are preserved untouched — this surface does not own them and
 * a stamp that deletes another trade's work is not a stamp.
 */
export function marketSurfaceUrlWriteback(
  currentSearch: string,
  symbol: string | null | undefined,
  timeframe: string | null | undefined,
): string | null {
  const nextSymbol = normalizeMarketSurfaceSymbol(symbol);
  const nextTimeframe = normalizeMarketSurfaceTimeframe(timeframe);
  // Nothing canonical to say. Leave whatever is there rather than blanking a
  // URL the trader may have arrived on.
  if (!nextSymbol && !nextTimeframe) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(currentSearch ?? "");
  } catch {
    return null;
  }

  if (nextSymbol) params.set("symbol", nextSymbol);
  if (nextTimeframe) params.set("tf", nextTimeframe);

  const next = params.toString();
  const current = (currentSearch ?? "").replace(/^\?/, "");
  if (next === current) return null;
  return next === "" ? "" : `?${next}`;
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
