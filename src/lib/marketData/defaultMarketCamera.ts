/**
 * WHERE THE FIRST-ARRIVAL MARKET CAMERA POINTS.
 *
 * THE CONTRADICTION THIS KILLS (measured on production 2026-09-21/22):
 * `/charts` opened on `NQ1!` for anyone with no saved camera. Measured on the
 * serving build, every W invention on that room reported UNMEASURED — not
 * because the selectors are wrong, and not because the market was quiet, but
 * because NO FUTURES TAPE WIRE EXISTS in `useWebSocket.ts` at all: crypto
 * routes to Coinbase (Binance.US fallback), equities route to Finnhub plus the
 * broker tick polls, and futures route to nothing. `hasVerifiedAggressorTape`
 * therefore gates `useOrderFlowReadings` shut forever on that symbol, so the
 * front door of the product was guaranteed to show conventional candles with
 * prose beside them — the exact failure the visual canon names by name.
 *
 * THE CUT: the default camera is DERIVED FROM THE CAPABILITY REGISTRY, not
 * hardcoded. A candidate is only eligible when the tape source it would wire
 * up passes the same `hasVerifiedAggressorTape` gate the draw loop itself
 * uses. One gate, one answer — if the registry ever stops certifying Coinbase,
 * this default moves on its own instead of quietly lying.
 *
 * WHAT THIS IS NOT:
 *   - Not a change to what the product is for. A trader's own saved symbol and
 *     their `wm_settings.defSym` both still win outright; this only decides
 *     what a camera with NO owner's choice behind it looks at.
 *   - Not a claim that crypto matters more than futures. It is a claim that a
 *     room WM can hear beats a room WM provably cannot.
 *
 * When the Founder's market-data subscription lands and a futures tape is
 * wired, add the futures candidate to CAMERA_CANDIDATES ahead of crypto and
 * this function will follow it without further edits.
 */
import { hasVerifiedAggressorTape, type RuntimeTapeSource } from "./capabilityRegistry";

export interface MarketCameraCandidate {
  /** The symbol as the chart's symbol vocabulary spells it. */
  symbol: string;
  /**
   * The tape source `useWebSocket` would actually open for this symbol.
   * `null` means "no wire exists" — which is the honest entry for futures
   * today, and is exactly what makes futures ineligible below.
   */
  tapeSource: RuntimeTapeSource;
}

/**
 * Ordered by preference, filtered by truth.
 *
 * `BTC` (not `BTC-USD`) is deliberate: COINBASE_PRODUCT in `useWebSocket.ts`
 * keys on `BTC`/`BTCUSD`, and a probe run with `BTC-USD` opened no socket at
 * all. A default symbol that misses that map would reintroduce the very
 * silence this module exists to end.
 */
export const CAMERA_CANDIDATES: readonly MarketCameraCandidate[] = Object.freeze([
  { symbol: "BTC", tapeSource: "coinbase" },
  { symbol: "ETH", tapeSource: "coinbase" },
]);

/**
 * The camera used when every candidate is deaf. Kept as the historical default
 * on purpose: if the registry ever certifies nothing, the product should land
 * where it has always landed and let the existing degraded-state labelling
 * explain the silence — not invent a new destination nobody approved.
 */
export const FALLBACK_CAMERA_SYMBOL = "NQ1!";

/**
 * First candidate whose tape the capability registry actually certifies.
 * Falls back to the historical default rather than returning nothing.
 */
export function resolveDefaultCameraSymbol(
  candidates: readonly MarketCameraCandidate[] = CAMERA_CANDIDATES,
): string {
  for (const candidate of candidates) {
    if (hasVerifiedAggressorTape(candidate.tapeSource)) return candidate.symbol;
  }
  return FALLBACK_CAMERA_SYMBOL;
}
