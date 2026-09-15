import type { MarketChannelCoverage } from "./coverageMap";
import type { MarketFidelityClass } from "./marketEvent";

export const CANONICAL_MARKET_STATE_SCHEMA_VERSION = "wm.market-state.v1" as const;

export type MarketStateResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";
export type MarketQualityState = "LIVE" | "DELAYED" | "STALE" | "PARTIAL" | "PROXY" | "REPLAY" | "UNAVAILABLE";

export interface MarketStateEvidenceRef {
  eventId: string;
  observedAt: number;
  availableAt: number;
  source: string;
  fidelity: MarketFidelityClass;
  basis: string;
}

export interface MarketStateDimension {
  resolution: MarketStateResolution;
  value: string | null;
  confidence: number | null;
  evidence: readonly MarketStateEvidenceRef[];
  contradictions: readonly string[];
  unknowns: readonly string[];
}

export interface CanonicalMarketStateInput {
  snapshotId: string;
  capturedAt: number;
  availableAt: number;
  instrumentId: string;
  normalizedSymbol: string;
  executableIdentity: string | null;
  assetClass: string;
  exchange: string | null;
  session: string;
  timeframeContext: readonly string[];
  qualityState: MarketQualityState;
  price: {
    last: number | null;
    bid: number | null;
    ask: number | null;
    eventAt: number | null;
    availableAt: number | null;
  };
  /**
   * SECOND PRICE OWNER — the newest loaded BAR CLOSE, never a trade print.
   *
   * `price.last` means "a live trade printed at this price and we hold the
   * timestamped tick that proves it." With a cash session closed that is
   * correctly null — and /charts consequently rendered `PRICE UNKNOWN` in the
   * MARKET tile while the chart header eight pixels away rendered the last
   * candle's close beside HISTORICAL BARS VERIFIED. Two owners, one
   * instrument, one moment. Understating knowledge is a truth defect in the
   * same family as overclaiming it.
   *
   * This is a SEPARATE field, deliberately:
   *   - it is NOT part of `hasPrice`, so it can never promote qualityState
   *     to LIVE or satisfy the "LIVE requires price evidence" rule;
   *   - it carries its own timeframe, because a close without one is not a
   *     fact a trader can use;
   *   - `null` stays the honest answer when no bars are loaded.
   *
   * Produced only by `deriveLastBarClose`, whose input is the loaded candle
   * array. `ticker.price` is NOT an acceptable source: it can originate from
   * a REST quote or from the SYMBOL_SEEDS table, and publishing either as a
   * "verified bar close" would fabricate provenance (§35 PROTECTED TRUTH).
   */
  lastBar?: {
    close: number;
    barOpenedAtMs: number;
    timeframe: string;
  } | null;
  coverage: readonly MarketChannelCoverage[];
  direction: MarketStateDimension;
  location: MarketStateDimension;
  aggression: MarketStateDimension;
  regime: MarketStateDimension;
  structure: MarketStateDimension;
  volatility: MarketStateDimension;
  profile: MarketStateDimension;
  orderFlow: MarketStateDimension;
  contradictions: readonly string[];
  unknowns: readonly string[];
}

export interface CanonicalMarketState extends CanonicalMarketStateInput {
  schemaVersion: typeof CANONICAL_MARKET_STATE_SCHEMA_VERSION;
  sealed: true;
}

const validEpoch = (value: number) => Number.isFinite(value) && value > 0;
const positiveOrMissing = (value: number | null) => value == null || (Number.isFinite(value) && value > 0);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function validateDimension(name: string, dimension: MarketStateDimension, cutoff: number): string[] {
  const errors: string[] = [];
  if (dimension.confidence != null &&
      (!Number.isFinite(dimension.confidence) || dimension.confidence < 0 || dimension.confidence > 1)) {
    errors.push(`${name} confidence must be between 0 and 1.`);
  }
  if (dimension.resolution === "RESOLVED" && (!dimension.value?.trim() || dimension.evidence.length === 0)) {
    errors.push(`${name} RESOLVED requires a value and evidence.`);
  }
  if (dimension.resolution === "UNKNOWN" && (dimension.value != null || dimension.unknowns.length === 0)) {
    errors.push(`${name} UNKNOWN requires no value and at least one explicit unknown.`);
  }
  for (const evidence of dimension.evidence) {
    if (!evidence.eventId.trim() || !evidence.source.trim() || !evidence.basis.trim() ||
        !validEpoch(evidence.observedAt) || !validEpoch(evidence.availableAt) ||
        evidence.availableAt < evidence.observedAt || evidence.availableAt > cutoff) {
      errors.push(`${name} contains evidence unavailable at snapshot time.`);
    }
  }
  return errors;
}

export function validateCanonicalMarketState(input: CanonicalMarketStateInput): string[] {
  const errors: string[] = [];
  if (!input.snapshotId.trim() || !input.instrumentId.trim() || !input.normalizedSymbol.trim() ||
      !input.assetClass.trim() || !input.session.trim() || input.timeframeContext.length === 0) {
    errors.push("Market State identity, session, and timeframe context are required.");
  }
  if (!validEpoch(input.capturedAt) || !validEpoch(input.availableAt) || input.availableAt < input.capturedAt) {
    errors.push("Market State chronology is invalid.");
  }
  if (![input.price.last, input.price.bid, input.price.ask].every(positiveOrMissing) ||
      (input.price.bid != null && input.price.ask != null && input.price.bid > input.price.ask)) {
    errors.push("Market State price evidence is invalid.");
  }
  const hasPrice = input.price.last != null || input.price.bid != null || input.price.ask != null;
  if (hasPrice && (!validEpoch(input.price.eventAt ?? 0) || !validEpoch(input.price.availableAt ?? 0) ||
      input.price.availableAt! < input.price.eventAt! || input.price.availableAt! > input.capturedAt)) {
    errors.push("Market State price was unavailable at snapshot time.");
  }
  if (!hasPrice && (input.price.eventAt != null || input.price.availableAt != null)) {
    errors.push("Market State cannot timestamp absent price evidence.");
  }
  if (input.qualityState === "LIVE" && !hasPrice) errors.push("LIVE Market State requires price evidence.");

  // The bar close is validated on its OWN terms and is deliberately absent
  // from `hasPrice` above — it must never be able to promote a snapshot to
  // LIVE or stand in for a trade print. A close without a usable stamp or
  // timeframe is not a fact; reject rather than publish a half-fact.
  if (input.lastBar != null) {
    if (!positiveOrMissing(input.lastBar.close) || input.lastBar.close == null ||
        !validEpoch(input.lastBar.barOpenedAtMs) ||
        input.lastBar.barOpenedAtMs > input.capturedAt ||
        !input.lastBar.timeframe.trim()) {
      errors.push("Market State last-bar evidence is invalid.");
    }
  }

  for (const [name, dimension] of Object.entries({
    Direction: input.direction,
    Location: input.location,
    Aggression: input.aggression,
    Regime: input.regime,
    Structure: input.structure,
    Volatility: input.volatility,
    Profile: input.profile,
    OrderFlow: input.orderFlow,
  })) errors.push(...validateDimension(name, dimension, input.capturedAt));

  return [...new Set(errors)];
}

/**
 * THE EIGHT NAMED DIMENSIONS, in one place.
 *
 * `/command-deck` renders `0/8 dimensions resolved` from this count; any
 * claim about "all of WM's determinations" has to agree with it.
 */
export const MARKET_STATE_DIMENSION_KEYS = [
  "direction", "location", "aggression", "regime",
  "structure", "volatility", "profile", "orderFlow",
] as const;

export type ContradictionDetectability =
  /** Fewer than two determinations exist. Nothing COULD have disagreed. */
  | "NOTHING_TO_COMPARE"
  /** At least two determinations exist and were compared. */
  | "COMPARABLE";

export interface ContradictionClaim {
  /** Never a bare "0" unless two things existed that could have disagreed. */
  readonly value: string;
  readonly measured: boolean;
  readonly warn: boolean;
  /** Always states the INPUT — how many determinations there were to compare. */
  readonly detail: string;
  readonly detectability: ContradictionDetectability;
  readonly determinationCount: number;
}

/**
 * THE SINGLE WRITER for every contradiction claim WM makes.
 *
 * `/command-deck` Data Fidelity rendered `CONTRADICTIONS 0` as a bare number in
 * the OK tone, four pixels from `UNKNOWNS 8` in the watch tone. Read together
 * those two cells say: *WM determined very little, and found no disagreement in
 * what it determined.* The second half is not a finding.
 *
 * **A contradiction requires two determinations to disagree.** With zero or one
 * determination on the packet, `contradictions.length === 0` is arithmetic about
 * an empty set, not evidence of coherence — exactly the shape cured for GAPS in
 * `coverageMap.describeGapCoverage`. Same law, different cell.
 *
 * This deliberately does NOT invent contradiction detectors. LABEL-NOT-MODEL:
 * the cure for an overclaim is a disclosure sentence, never a fabricated
 * number and never a changed selector. Widening what WM cross-checks is real
 * work with real evidence requirements; it is not this commit.
 */
export function describeContradictionCoverage(state: {
  readonly contradictions: readonly string[];
  readonly price?: { readonly last: number | null } | null;
  readonly lastBar?: { readonly close: number } | null;
} & Partial<Record<(typeof MARKET_STATE_DIMENSION_KEYS)[number], MarketStateDimension>>,
): ContradictionClaim {
  // A "determination" is anything WM has actually committed to a value for.
  // Only those can disagree with one another.
  let determinationCount = 0;
  for (const key of MARKET_STATE_DIMENSION_KEYS) {
    if (state[key]?.resolution === "RESOLVED") determinationCount += 1;
  }
  if (state.price?.last != null) determinationCount += 1;
  if (state.lastBar?.close != null) determinationCount += 1;

  const found = state.contradictions.length;

  // An OBSERVED contradiction is always reportable, whatever the denominator.
  // Finding one proves at least two determinations existed to disagree.
  if (found > 0) {
    return {
      value: String(found),
      measured: true,
      warn: true,
      detail: `${found} contradiction${found === 1 ? "" : "s"} observed between WM's own determinations.`,
      detectability: "COMPARABLE",
      determinationCount,
    };
  }

  if (determinationCount < 2) {
    return {
      value: "n/a",
      measured: false,
      warn: false,
      detail:
        determinationCount === 0
          ? "WM has resolved nothing yet, so there is nothing that could contradict anything. " +
            "Zero contradictions here is not evidence of agreement."
          : "WM has resolved exactly one thing, and one determination cannot contradict itself. " +
            "Zero contradictions here is not evidence of agreement.",
      detectability: "NOTHING_TO_COMPARE",
      determinationCount,
    };
  }

  return {
    value: "0",
    measured: true,
    warn: false,
    detail: `${determinationCount} determinations were compared and none disagreed.`,
    detectability: "COMPARABLE",
    determinationCount,
  };
}

/** One sealed, outcome-free packet for all WM market-intelligence consumers. */
export function sealCanonicalMarketState(input: CanonicalMarketStateInput): CanonicalMarketState {
  const errors = validateCanonicalMarketState(input);
  if (errors.length) throw new Error(errors.join(" "));
  return deepFreeze({
    ...structuredClone(input),
    // Normalize at the seal so every SEALED packet carries the key explicitly.
    // The field is optional on the INPUT type purely so this stayed additive —
    // no existing producer or fixture had to be rewritten to adopt it — but a
    // consumer must never have to distinguish "absent" from "no bar close".
    lastBar: input.lastBar ?? null,
    schemaVersion: CANONICAL_MARKET_STATE_SCHEMA_VERSION,
    sealed: true,
  });
}
