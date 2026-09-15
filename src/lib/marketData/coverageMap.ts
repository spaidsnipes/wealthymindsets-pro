import type {
  MarketDataCapability,
  MarketEventCapability,
  PersistenceRight,
} from "./capabilityRegistry";

export const MARKET_COVERAGE_SCHEMA_VERSION = "wm.market-coverage.v1" as const;

export type CoverageState =
  | "CONNECTING"
  | "COLLECTING"
  | "GAPPED"
  | "STALE"
  | "UNAVAILABLE"
  | "REPLAY";

export type MemoryState = "NO_MEMORY" | "SESSION_ONLY" | "SUMMARY_ONLY" | "RETAINED";

export interface MarketChannelCoverage {
  schemaVersion: typeof MARKET_COVERAGE_SCHEMA_VERSION;
  instrumentId: string;
  normalizedSymbol?: string;
  channel: MarketEventCapability;
  providerPath: string;
  coverageState: CoverageState;
  memoryState: MemoryState;
  persistenceRight: PersistenceRight;
  rightsPolicyId: string;
  observedFrom?: number;
  observedThrough?: number;
  lastEventAt?: number;
  /** Operational receipt count only. No event payloads or event IDs are retained. */
  observedEventCount: number;
  gapCount: number;
  /**
   * How many observed events arrived with NO usable sequence number.
   *
   * `gapCount` alone cannot be read as evidence. A sequence gap is only
   * detectable when the provider stamps a monotonic sequence on each event;
   * `MarketEventGuard` already distinguishes the two cases and emits
   * `SEQUENCE_GAP` (a gap was OBSERVED) versus `SEQUENCE_UNAVAILABLE` (a gap
   * could not be looked for). The second warning used to be dropped at this
   * boundary, so a channel that can NEVER detect a gap was indistinguishable
   * from one that looked and found none — both reported `gapCount: 0`.
   *
   * OPTIONAL on purpose. A coverage summary restored from an older persisted
   * schema genuinely does not know this, and `undefined` must therefore mean
   * UNKNOWN. Defaulting it to `0` would re-assert the exact claim this field
   * exists to stop making. H1: absence is not zero.
   */
  unsequencedEventCount?: number;
  lastGapAt?: number;
  fidelity: MarketDataCapability["fidelityClass"];
  collectionScope: MarketDataCapability["collectionScope"];
  detail: string;
}

export interface CoverageObservation {
  eventAt: number;
  receivedAt: number;
  /** A sequence gap was OBSERVED — the stream is sequenced and a number was skipped. */
  sequenceGap?: boolean;
  /**
   * This event carried no usable sequence, so a gap could not be looked for.
   * Mirrors `MarketEventGuard`'s `SEQUENCE_UNAVAILABLE` warning. Distinct from
   * `sequenceGap: false`, which means "looked, found none".
   */
  sequenceUnavailable?: boolean;
}

export function createChannelCoverage(
  instrumentId: string,
  capability: MarketDataCapability,
): MarketChannelCoverage {
  if (!instrumentId.trim()) throw new Error("Coverage requires an instrument identity.");

  const unavailable = capability.availability === "UNAVAILABLE";
  return {
    schemaVersion: MARKET_COVERAGE_SCHEMA_VERSION,
    instrumentId,
    channel: capability.eventType,
    providerPath: capability.providerPath,
    coverageState: unavailable ? "UNAVAILABLE" : "CONNECTING",
    memoryState: "NO_MEMORY",
    persistenceRight: capability.rawPersistenceRight,
    rightsPolicyId: capability.rightsPolicyId,
    observedEventCount: 0,
    gapCount: 0,
    unsequencedEventCount: 0,
    fidelity: capability.fidelityClass,
    collectionScope: capability.collectionScope,
    detail: unavailable
      ? "No verified channel implementation."
      : "No evidence observed in this runtime yet.",
  };
}

/** Records coverage facts only; raw market payloads are never stored here. */
export function observeChannel(
  coverage: MarketChannelCoverage,
  observation: CoverageObservation,
): MarketChannelCoverage {
  if (!Number.isFinite(observation.eventAt) || !Number.isFinite(observation.receivedAt) ||
      observation.eventAt <= 0 || observation.receivedAt <= 0) {
    throw new Error("Coverage observations require valid epoch-millisecond timestamps.");
  }
  if (coverage.coverageState === "UNAVAILABLE") return coverage;

  const observedFrom = Math.min(coverage.observedFrom ?? observation.eventAt, observation.eventAt);
  const observedThrough = Math.max(coverage.observedThrough ?? observation.eventAt, observation.eventAt);
  const sequenceGap = observation.sequenceGap === true;
  const sequenceUnavailable = observation.sequenceUnavailable === true;

  return {
    ...coverage,
    coverageState: sequenceGap ? "GAPPED" : "COLLECTING",
    // Current browser collectors retain only in-memory/session evidence. Rights
    // alone never promote a channel to durable memory.
    memoryState: coverage.memoryState === "SUMMARY_ONLY" ? "SUMMARY_ONLY" : "SESSION_ONLY",
    observedFrom,
    observedThrough,
    lastEventAt: observation.receivedAt,
    observedEventCount: coverage.observedEventCount + 1,
    gapCount: coverage.gapCount + (sequenceGap ? 1 : 0),
    // `?? 0` is safe HERE and only here: we are about to add an observation we
    // witnessed ourselves, so the running total starts from what this runtime
    // has actually seen. Readers must still treat `undefined` as UNKNOWN.
    unsequencedEventCount: (coverage.unsequencedEventCount ?? 0) + (sequenceUnavailable ? 1 : 0),
    lastGapAt: sequenceGap ? observation.receivedAt : coverage.lastGapAt,
    detail: sequenceGap
      ? "Collection continues, but sequence coverage contains a known gap."
      : "Live evidence observed in this runtime; historical retention is not implied.",
  };
}

export function markCoverageStale(
  coverage: MarketChannelCoverage,
  now: number,
  staleAfterMs: number,
): MarketChannelCoverage {
  if (coverage.lastEventAt == null || coverage.coverageState === "UNAVAILABLE") return coverage;
  if (!Number.isFinite(now) || !Number.isFinite(staleAfterMs) || staleAfterMs < 0) {
    throw new Error("Staleness evaluation requires valid non-negative timing inputs.");
  }
  if (now - coverage.lastEventAt <= staleAfterMs) return coverage;
  return {
    ...coverage,
    coverageState: "STALE",
    detail: "No event arrived inside the configured freshness window.",
  };
}

/**
 * Can this channel's `gapCount` be read as evidence at all?
 *
 * - `UNOBSERVED`  — nothing has been observed, so there is nothing to say.
 * - `UNDETECTABLE` — every observed event arrived unsequenced. A gap could not
 *                    have been noticed. `gapCount: 0` here means "never looked",
 *                    NOT "looked and found none".
 * - `PARTIAL`     — some events carried a sequence and some did not. Any count
 *                   is a floor, never a total.
 * - `SEQUENCED`   — every observed event carried a sequence. `gapCount` is a
 *                   real measurement.
 * - `UNKNOWN`     — a summary restored from a schema that predates
 *                   `unsequencedEventCount`. We do not know what it looked at.
 */
export type GapDetectability =
  | "UNOBSERVED"
  | "UNDETECTABLE"
  | "PARTIAL"
  | "SEQUENCED"
  | "UNKNOWN";

export function gapDetectability(coverage: MarketChannelCoverage): GapDetectability {
  if (coverage.unsequencedEventCount == null) return "UNKNOWN";
  if (coverage.observedEventCount <= 0) return "UNOBSERVED";
  if (coverage.unsequencedEventCount >= coverage.observedEventCount) return "UNDETECTABLE";
  if (coverage.unsequencedEventCount > 0) return "PARTIAL";
  return "SEQUENCED";
}

export interface GapClaim {
  /** What a surface may print. Never a bare "0" unless that zero was measured. */
  readonly value: string;
  /** True only when `gapCount` is a real measurement a surface may assert. */
  readonly measured: boolean;
  /** True when the number should draw the eye. */
  readonly warn: boolean;
  /** Long-form explanation for a title/aria string. Always states the INPUT. */
  readonly detail: string;
  readonly detectability: GapDetectability;
}

/**
 * THE SINGLE WRITER for every gap claim WM makes on any surface.
 *
 * Both `/command-deck` (Data Fidelity → GAPS) and `/nectar/[symbol]` (channel
 * receipts → Gaps) used to format this themselves, and both printed an
 * affirmative zero — `0` in the OK tone, and the word `None`. Neither could
 * have been true: every shipped adapter declares `sequenceState: "UNAVAILABLE"`,
 * so `MarketEventGuard` never emits `SEQUENCE_GAP`, so `gapCount` is
 * structurally pinned at 0. The screen was reporting the absence of a
 * DETECTOR as the absence of GAPS.
 *
 * The cure ships in ONE function so it cannot rot on one screen while looking
 * healthy on the other.
 */
export function describeGapCoverage(coverage: MarketChannelCoverage): GapClaim {
  const detectability = gapDetectability(coverage);
  const n = coverage.gapCount;

  if (n > 0) {
    return {
      value: String(n),
      measured: true,
      warn: true,
      detail: `${n} sequence gap${n === 1 ? "" : "s"} observed on this channel.`,
      detectability,
    };
  }

  switch (detectability) {
    case "SEQUENCED":
      return {
        value: "0",
        measured: true,
        warn: false,
        detail: "This channel is sequenced and no gap was observed.",
        detectability,
      };
    case "PARTIAL":
      return {
        value: "0 of some",
        measured: false,
        warn: false,
        detail:
          `No gap observed, but ${coverage.unsequencedEventCount} of ` +
          `${coverage.observedEventCount} events arrived unsequenced — any gap ` +
          "among those could not have been seen.",
        detectability,
      };
    case "UNDETECTABLE":
      return {
        value: "n/a",
        measured: false,
        warn: false,
        detail:
          "This provider stamps no sequence on its events, so a gap cannot be " +
          "detected here. Zero gaps observed is not evidence of zero gaps.",
        detectability,
      };
    case "UNOBSERVED":
      return {
        value: "—",
        measured: false,
        warn: false,
        detail: "No events observed on this channel yet — nothing to check.",
        detectability,
      };
    case "UNKNOWN":
    default:
      return {
        value: "—",
        measured: false,
        warn: false,
        detail:
          "This coverage summary was restored from an earlier schema that did " +
          "not record whether gaps were detectable. Unknown, not zero.",
        detectability,
      };
  }
}

/**
 * Aggregate the same claim across many channels, for surfaces that show one
 * number for a whole instrument. A single undetectable channel makes the
 * TOTAL unmeasured — you cannot add a real zero to an unknown and get a real
 * zero.
 */
export function describeGapCoverageTotal(
  channels: readonly MarketChannelCoverage[],
): GapClaim {
  if (channels.length === 0) {
    return {
      value: "—",
      measured: false,
      warn: false,
      detail: "No channels observed — nothing to check.",
      detectability: "UNOBSERVED",
    };
  }

  const claims = channels.map(describeGapCoverage);
  const total = channels.reduce((s, c) => s + c.gapCount, 0);
  const unmeasured = claims.filter((c) => !c.measured && c.detectability !== "UNOBSERVED");

  if (total > 0) {
    const suffix = unmeasured.length
      ? ` (${unmeasured.length} further channel${unmeasured.length === 1 ? "" : "s"} cannot be checked)`
      : "";
    return {
      value: unmeasured.length ? `${total}+` : String(total),
      measured: unmeasured.length === 0,
      warn: true,
      detail: `${total} sequence gap${total === 1 ? "" : "s"} observed across channels${suffix}.`,
      detectability: unmeasured.length ? "PARTIAL" : "SEQUENCED",
    };
  }

  if (unmeasured.length === 0) {
    const observed = claims.some((c) => c.detectability === "SEQUENCED");
    return observed
      ? {
          value: "0",
          measured: true,
          warn: false,
          detail: "Every observed channel is sequenced and no gap was observed.",
          detectability: "SEQUENCED",
        }
      : {
          value: "—",
          measured: false,
          warn: false,
          detail: "No events observed yet — nothing to check.",
          detectability: "UNOBSERVED",
        };
  }

  return {
    value: "n/a",
    measured: false,
    warn: false,
    detail:
      // Subject and verb disagree in NUMBER, so they pluralize in OPPOSITE
      // directions: one channel *stamps*, several channels *stamp*. Observed
      // live on /command-deck reading "1 of 1 channel stamp no usable
      // sequence". A disclosure sentence is the one sentence on the screen
      // that has to be read and believed; broken grammar is what makes a
      // reader skim it.
      `${unmeasured.length} of ${channels.length} channel${channels.length === 1 ? "" : "s"} ` +
      `${unmeasured.length === 1 ? "stamps" : "stamp"} no usable sequence, so gaps ` +
      "cannot be detected there. Zero gaps observed is not evidence of zero gaps.",
    detectability: unmeasured.every((c) => c.detectability === "UNDETECTABLE")
      ? "UNDETECTABLE"
      : "PARTIAL",
  };
}

/**
 * `gapCount === 0` was a load-bearing condition here, and it was the weakest
 * one in the predicate: unreachable-by-construction, therefore always
 * satisfied. A channel that cannot detect a gap must not be able to satisfy a
 * "no gaps" requirement — that is the definition of an unearned claim.
 *
 * Now the gap evidence must be MEASURED, not merely zero.
 */
export function canClaimRetainedCoverage(coverage: MarketChannelCoverage): boolean {
  const gaps = describeGapCoverage(coverage);
  return coverage.memoryState === "RETAINED" &&
    coverage.persistenceRight === "ALLOWED" &&
    coverage.observedFrom != null &&
    coverage.observedThrough != null &&
    gaps.measured &&
    coverage.gapCount === 0;
}
