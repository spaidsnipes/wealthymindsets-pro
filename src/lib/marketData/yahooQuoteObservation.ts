import type { MarketFidelityClass } from "./marketEvent";

/**
 * YahooQuoteObservation — SF-D01 (Sunday-futures truth spec, V1.0.1).
 *
 * A native `MarketStateResolution`-based discriminated union over exactly
 * two states: RESOLVED and UNKNOWN. There is deliberately no PARTIAL and no
 * STALE member — a real observation that is simply old is still RESOLVED and
 * carries an honest `ageMs`; the consumer decides staleness from age.
 *
 * Founder-canon rule this enforces (SF-D01):
 *   "Day/meta receipts and server time cannot be borrowed as observation
 *    chronology."
 *
 * The UNKNOWN variant STRUCTURALLY FORBIDS event, observation time,
 * availability, age, and observed fidelity — they are simply not on the type,
 * so no consumer can read a fabricated timestamp off an unresolved quote. Its
 * `reasons` are always nonempty and its `receivedAt` is nullable (transport
 * receipt only; never promoted to observation chronology).
 *
 * The observation `resolution` discriminant matches the canonical
 * `MarketStateResolution` vocabulary (RESOLVED | UNKNOWN subset).
 */

export const YAHOO_QUOTE_OBSERVATION_SPEC_VERSION = "wm.sf-d01.v1.0.1" as const;

/** RESOLVED — a real traded price with a REAL observation timestamp. */
export interface ResolvedYahooQuoteObservation {
  readonly resolution: "RESOLVED";
  readonly specVersion: typeof YAHOO_QUOTE_OBSERVATION_SPEC_VERSION;
  readonly symbol: string;
  readonly normalizedSymbol: string;
  /** Observed traded price. Never a day/meta fallback. */
  readonly price: number;
  /**
   * REAL observation epoch-ms — the exchange/provider timestamp of the traded
   * price. NEVER server time, NEVER a day/meta receipt.
   */
  readonly observedAt: number;
  /** When the observation became available to us: max(observedAt, receivedAt). */
  readonly availableAt: number;
  /** Transport receive time (when the proxy got the upstream bytes). */
  readonly receivedAt: number;
  /** capturedAt − observedAt, clamped ≥ 0. Honest age of the observation. */
  readonly ageMs: number;
  /** Observed fidelity of the price. A real live tick is OBSERVED. */
  readonly fidelity: MarketFidelityClass;
}

/**
 * UNKNOWN — no resolvable observation. Structurally carries NO event,
 * observation time, availability, age, or fidelity. `reasons` is nonempty.
 * `receivedAt` is nullable and is transport-only (never observation chronology).
 */
export interface UnknownYahooQuoteObservation {
  readonly resolution: "UNKNOWN";
  readonly specVersion: typeof YAHOO_QUOTE_OBSERVATION_SPEC_VERSION;
  readonly symbol: string;
  readonly normalizedSymbol: string;
  readonly reasons: readonly string[];
  readonly receivedAt: number | null;
}

export type YahooQuoteObservation =
  | ResolvedYahooQuoteObservation
  | UnknownYahooQuoteObservation;

export interface YahooQuoteObservationInput {
  readonly symbol: string;
  readonly normalizedSymbol: string;
  /**
   * Most-recent live traded price from the pre/post-aware intraday series,
   * or null when the series carried no live trade (e.g. Sunday equity).
   */
  readonly livePrice: number | null;
  /**
   * The REAL exchange/observation epoch-ms of `livePrice` (the intraday
   * timestamp that produced it). null when it is unavailable — in which case
   * the observation MUST resolve UNKNOWN rather than borrow another clock.
   */
  readonly liveObservedAt: number | null;
  /** Transport receive time (proxy fetch). null when not captured. */
  readonly receivedAt: number | null;
  /** Snapshot capture time (server now). Used ONLY to compute age of a
   *  RESOLVED observation — never as observation chronology. */
  readonly capturedAt: number;
  /** Observed fidelity to assign a RESOLVED observation. Default OBSERVED. */
  readonly fidelity?: MarketFidelityClass;
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Pure, deterministic builder. Given the raw materials the Yahoo quote proxy
 * has, produce a faithful observation. It resolves RESOLVED ONLY when there is
 * a real traded price AND a real observation timestamp for it. Otherwise it
 * resolves UNKNOWN with nonempty reasons and never invents chronology.
 *
 * No Date.now() inside — capturedAt is injected so the function stays pure and
 * testable.
 */
export function buildYahooQuoteObservation(
  input: YahooQuoteObservationInput,
): YahooQuoteObservation {
  const base = {
    specVersion: YAHOO_QUOTE_OBSERVATION_SPEC_VERSION,
    symbol: input.symbol,
    normalizedSymbol: input.normalizedSymbol,
  } as const;

  const reasons: string[] = [];

  if (!isPositiveFinite(input.livePrice)) {
    reasons.push(
      "No live traded price in the pre/post-aware intraday series; a day/meta close must not be presented as a live observation.",
    );
    return { ...base, resolution: "UNKNOWN", reasons, receivedAt: input.receivedAt ?? null };
  }

  if (!isPositiveFinite(input.liveObservedAt)) {
    reasons.push(
      "Live traded price present but its observation timestamp is unavailable; server time and day/meta receipts cannot be borrowed as observation chronology.",
    );
    return { ...base, resolution: "UNKNOWN", reasons, receivedAt: input.receivedAt ?? null };
  }

  const observedAt = input.liveObservedAt;
  // receivedAt is transport-only: using capturedAt (server now) here is
  // permitted because it is NOT observation chronology. observedAt is the
  // only field that carries real observation time.
  const receivedAt = isPositiveFinite(input.receivedAt) ? input.receivedAt : input.capturedAt;
  const availableAt = Math.max(observedAt, receivedAt);
  const ageMs = Math.max(0, input.capturedAt - observedAt);

  return {
    ...base,
    resolution: "RESOLVED",
    price: input.livePrice,
    observedAt,
    availableAt,
    receivedAt,
    ageMs,
    fidelity: input.fidelity ?? "OBSERVED",
  };
}

/** Ergonomic type guard for consumers. */
export function isResolvedYahooQuote(
  observation: YahooQuoteObservation,
): observation is ResolvedYahooQuoteObservation {
  return observation.resolution === "RESOLVED";
}
