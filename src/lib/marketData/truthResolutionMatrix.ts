/**
 * truthResolutionMatrix — Founder 2029 Integration Glue canon
 * §NEW GLUE INVENTION — TRUTH RESOLUTION MATRIX (2026-08-20).
 *
 * Canon verbatim:
 *   "Each semantic market claim has a minimum evidence resolution.
 *    Example classes may include OHLC-only, quote/snapshot, signed
 *    trades, depth/L2, and execution/queue-sensitive. If the
 *    current source does not meet the requirement, the claim is
 *    suppressed, softened, or labeled unavailable. This matrix
 *    governs words such as aggressive buyer/seller, absorption,
 *    iceberg, liquidity defense, sweep, and refill."
 *
 * Also enforces canon rejection #3 ABSORPTION / ICEBERG OVERCLAIM
 * and #6 INTENT LANGUAGE — surfaces must not display these words
 * unless the current source class meets or exceeds the required
 * resolution.
 *
 * PURE / DETERMINISTIC. Callers pass a source class + claim, get
 * back { allowed, softened?, reason }. Zero runtime state.
 */

/**
 * Ordered resolution ladder — higher index = higher fidelity.
 * A source at level N supports every claim requiring ≤ N.
 */
export const RESOLUTION_LADDER = [
  "NONE",                // no source at all
  "OHLC_ONLY",           // bars only (yahoo delayed, historical)
  "QUOTE_SNAPSHOT",      // bid/ask snapshots + last-trade
  "SIGNED_TRADES",       // aggressor-side classification available
  "DEPTH_L2",            // depth-of-market visible with lifecycle
  "EXECUTION_QUEUE",     // queue position / execution sequence
] as const;

export type SourceResolution = typeof RESOLUTION_LADDER[number];

const LEVEL: Record<SourceResolution, number> = RESOLUTION_LADDER
  .reduce((acc, name, i) => { acc[name] = i; return acc; }, {} as Record<SourceResolution, number>);

/**
 * Claim families — canon §Technical Truth Corrections + §Rejections
 * name each of these explicitly. Adding a new claim requires
 * naming its minimum required resolution here; never render the
 * claim on a surface without checking through this module.
 */
export type MarketClaim =
  | "OHLC_BAR"                // basic candle
  | "SESSION_STATE"           // RTH / ETH / etc — needs source at all
  | "PRICE_DIRECTION"         // last-close vs open — OHLC sufficient
  | "AGGRESSIVE_SIDE"         // "aggressive buyer/seller" — needs signed trades
  | "CVD"                     // cumulative volume delta — needs signed trades
  | "ABSORPTION"              // "absorption" characteristics — needs signed trades + depth
  | "ABSORPTION_CONFIRMED"    // "absorption confirmed" — even stricter, needs L2 + queue
  | "ICEBERG"                 // "iceberg detected" — needs L2 + queue
  | "LIQUIDITY_DEFENSE"       // "defense at the offer" — needs L2 lifecycle
  | "SWEEP"                   // "liquidity sweep" — needs signed trades + depth
  | "REFILL"                  // "resting liquidity refilled" — needs L2 lifecycle
  | "INSTITUTIONAL_INTENT";   // "smart money" / "institutional migration" — DISALLOWED (motive claim)

/**
 * Required minimum resolution per claim. Motive/intent claims are
 * mapped to a special DISALLOWED marker so callers cannot pass
 * a "high-enough" source and slip them through.
 */
const REQUIRED: Record<MarketClaim, SourceResolution | "DISALLOWED"> = {
  OHLC_BAR:              "OHLC_ONLY",
  SESSION_STATE:         "OHLC_ONLY",
  PRICE_DIRECTION:       "OHLC_ONLY",
  AGGRESSIVE_SIDE:       "SIGNED_TRADES",
  CVD:                   "SIGNED_TRADES",
  ABSORPTION:            "SIGNED_TRADES",
  ABSORPTION_CONFIRMED:  "EXECUTION_QUEUE",
  ICEBERG:               "EXECUTION_QUEUE",
  LIQUIDITY_DEFENSE:     "DEPTH_L2",
  SWEEP:                 "DEPTH_L2",
  REFILL:                "DEPTH_L2",
  INSTITUTIONAL_INTENT:  "DISALLOWED",  // motive can't be inferred from tape
};

export interface ClaimDecision {
  /** True when the source meets the required resolution. */
  readonly allowed: boolean;
  /**
   * When !allowed, the softened alternative the surface may use
   * instead (e.g. "absorption characteristics" for ABSORPTION).
   * null when the claim has no accepted softened form and must be
   * suppressed entirely (e.g. motive claims).
   */
  readonly softened: string | null;
  /** Short reason phrase for the WHY? inspector. */
  readonly reason: string;
}

const SOFTENED: Partial<Record<MarketClaim, string>> = {
  AGGRESSIVE_SIDE:      "trade activity higher on one side",
  CVD:                  "cumulative volume delta unavailable at this fidelity",
  ABSORPTION:           "absorption characteristics",
  ABSORPTION_CONFIRMED: "absorption characteristics",
  ICEBERG:              "large resting size observed",
  LIQUIDITY_DEFENSE:    "resting size present near this level",
  SWEEP:                "aggressive move through prior liquidity",
  REFILL:               "resting size returned near this level",
};

/**
 * Ask whether a claim may be rendered given the current source
 * resolution. Returns the softened alternative + reason when the
 * claim must be downgraded or suppressed.
 */
export function evaluateClaim(claim: MarketClaim, source: SourceResolution): ClaimDecision {
  const req = REQUIRED[claim];
  if (req === "DISALLOWED") {
    return {
      allowed: false,
      softened: null,
      reason: "motive/intent cannot be inferred from tape",
    };
  }
  const requiredLevel = LEVEL[req];
  const sourceLevel = LEVEL[source];
  if (sourceLevel >= requiredLevel) {
    return { allowed: true, softened: null, reason: "source resolution sufficient" };
  }
  const softened = SOFTENED[claim] ?? null;
  return {
    allowed: false,
    softened,
    reason: `needs ${req.toLowerCase().replace(/_/g, " ")}; have ${source.toLowerCase().replace(/_/g, " ")}`,
  };
}

/**
 * Convenience for callers with a source-name string that may or may
 * not match the ladder (e.g. "yahoo", "coinbase", "unavailable").
 * Maps known provider names to their observable resolution class.
 * Unknown providers default to OHLC_ONLY (safest under-claim).
 */
export function providerToResolution(source: string | null | undefined): SourceResolution {
  if (!source) return "NONE";
  const s = source.toLowerCase();
  if (s === "unavailable") return "NONE";
  if (s === "yahoo" || s === "finnhub") return "OHLC_ONLY";
  if (s === "alpaca") return "QUOTE_SNAPSHOT";
  if (s === "coinbase" || s === "binance") return "SIGNED_TRADES";
  if (s === "polygon") return "SIGNED_TRADES";
  return "OHLC_ONLY";
}
