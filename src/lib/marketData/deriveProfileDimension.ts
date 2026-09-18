/**
 * deriveProfileDimension — bridge the compiled Living Profile →
 * CanonicalMarketState `profile` dimension.
 *
 * FOUND FROM USE, not from a test. On a live BTC chart the Living Profile
 * panel published VAH 76280 / POC 76000 / VAL 75700 from 248 measured buckets,
 * while the Market Object Passport in the rail eight inches to its right read
 * *"Unresolved: location, aggression, structure, profile."* Two surfaces, one
 * screen, one instrument, one instant — and they disagreed about whether a
 * profile existed at all. That is Canon Weakness #1 in its purest form, and it
 * is the third time this exact shape has been repaired here: ORDER FLOW and
 * VOLATILITY were both hard-coded unresolved beside live evidence before this.
 *
 * The cause was never subtle. `chartMarketStatePublisher` listed `"Profile"` as
 * an unconditional entry in its unresolved-dimensions array, because at the
 * time nothing in the product could measure one. Something can now.
 *
 * ── WHY THIS TAKES A COMPILED VM RATHER THAN TICKS ──────────────────────────
 *
 * Every other deriver in this folder takes raw ticks. This one deliberately
 * does not. Volume-at-price is the ONE reading in this product with two honest
 * inputs — the per-trade tape and a candle estimate — and `selectLivingProfile`
 * (over `buildLivingProfileSnapshot`) is the single chooser between them. If
 * this file re-derived a profile from ticks it would become a SECOND chooser,
 * and the Passport could then seal a POC the panel beside it never drew.
 *
 * So the dimension is a pure READING of what the owner already decided. It
 * mints no new observation, which is exactly why it may restate one.
 *
 * ── WHY THE CANDLE PATH STILL GETS A VALUE ──────────────────────────────────
 *
 * The estimated path spreads each bar's volume EVENLY across its high–low
 * range, so the within-bar shape is flat by construction — which is why the
 * compiler withholds HVN/LVN there and says so. It does NOT withhold
 * POC/VAH/VAL, because those are aggregates that survive the even spread.
 *
 * This deriver honours that line exactly: an estimated profile resolves to
 * PARTIAL and carries the compiler's own refusal in `unknowns`, but it still
 * states the value-area verdict, because that verdict is computed from levels
 * the owner already published. Withholding it here would be a SECOND refusal
 * the compiler never made — and a Passport stricter than the panel it is
 * describing is the same two-owners defect pointing the other way.
 *
 * PURE — no I/O, no clock. Fabrication safeguards:
 *   - Unmeasured profile → UNKNOWN, carrying the compiler's own missing-input
 *     sentence rather than a sentence composed here.
 *   - Missing or degenerate levels → UNKNOWN, never a guessed value area.
 *   - Confidence is bucketed by populated bucket count, never inferred from
 *     the width itself.
 */

import type { LivingProfileVM } from "./viewModels/selectLivingProfile";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

const UNKNOWN_BASE = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
} as const;

/**
 * Below this many populated buckets the distribution has too little structure
 * to seal as a decision-grade read — a "value area" spanning four buckets is
 * an artefact of a thin sample, not an auction. Canon §Silence Is A Feature.
 */
export const PROFILE_RESOLVE_MIN_BUCKETS = 12;

/**
 * Value-area width as a fraction of the sampled price range.
 *
 * A profile's own claim is WHERE the auction agreed, and the most honest
 * single-word summary of that is how much of the sampled range the agreement
 * actually covers. At or below 35% the auction built a narrow accepted core;
 * at or above 70% the volume is spread so broadly that "value" names most of
 * the range and therefore distinguishes very little.
 *
 * Both numbers are measured off levels the compiler already published. Nothing
 * here re-reads the tape.
 */
export const PROFILE_TIGHT_MAX_RATIO = 0.35;
export const PROFILE_BROAD_MIN_RATIO = 0.70;

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * Exported as data for the same reason `VOLATILITY_VERDICTS` is: the consumers
 * that matter read this dimension BY VALUE, and when a producer's words and a
 * matcher's expectations drift apart nothing throws, nothing fails `tsc`, and
 * no test turns red — the guard simply never fires and the surface prints
 * UNKNOWN forever. A fourth verdict added here should fail a symmetry test
 * until some reader claims it or a test declares it deliberately unmatched.
 */
export const PROFILE_VERDICTS = {
  TIGHT: "TIGHT VALUE",
  DEFINED: "DEFINED VALUE",
  BROAD: "BROAD VALUE",
} as const;

export type ProfileVerdict = (typeof PROFILE_VERDICTS)[keyof typeof PROFILE_VERDICTS];

export interface DeriveProfileInput {
  /** The profile the room already compiled. Never re-derived here. */
  readonly vm: LivingProfileVM | null | undefined;
  /** Provider tag for the evidence ref. */
  readonly source: string | null | undefined;
  /** Latest tick timestamp (ms). Used as observedAt (clamped to capturedAt). */
  readonly latestTickAtMs: number | null;
  /** Snapshot cutoff — evidence.availableAt must be ≤ this. */
  readonly capturedAt: number;
  /** Stable id used in the evidence eventId (typically the snapshot id). */
  readonly snapshotIdSeed: string;
  /**
   * WHY THERE IS NOTHING TO MEASURE, when the caller knows something this
   * deriver cannot see. See the matching field on `DeriveAggressionInput` for
   * the live measurement that made it necessary: on /command-deck the Passport
   * reported no profile while 120 candles were drawn beside it, because that
   * venue publishes no per-bar volume and a profile is a volume distribution.
   * "None has been distributed YET" implies waiting will help. It will not.
   *
   * Optional — absent leaves the previous wording exactly as it was.
   */
  readonly evidenceGapNote?: string | null;
}

function unknown(note: string): MarketStateDimension {
  return { ...UNKNOWN_BASE, unknowns: [note] };
}

function verdictFor(ratio: number): ProfileVerdict {
  if (ratio <= PROFILE_TIGHT_MAX_RATIO) return PROFILE_VERDICTS.TIGHT;
  if (ratio >= PROFILE_BROAD_MIN_RATIO) return PROFILE_VERDICTS.BROAD;
  return PROFILE_VERDICTS.DEFINED;
}

function confidenceFor(buckets: number, tradeBased: boolean): number {
  // The candle path is capped below the trade path at every sample size. It is
  // reading the same auction through a flat within-bar assumption, and a number
  // that cannot tell a real ripple from two bars overlapping does not get to be
  // as sure as one that can.
  const base = buckets >= 120 ? 0.75 : buckets >= 40 ? 0.55 : 0.35;
  return tradeBased ? base : Math.min(base, 0.4);
}

function evidenceRefFor(
  input: DeriveProfileInput,
  vm: LivingProfileVM,
  ratio: number,
): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  const tradeBased = vm.quality === "trade-based";
  return {
    eventId: `profile:value-area:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    // The candle path is an ESTIMATE of a distribution, not a distribution
    // observed. Labelling both DERIVED would let a reader that ranks by
    // fidelity treat a spread-evenly guess as equal to counted trades.
    fidelity: tradeBased ? "DERIVED" : "INFERRED",
    basis: tradeBased
      ? `Value area spans ${(ratio * 100).toFixed(1)}% of the sampled range across `
        + `${vm.populatedRows} populated price bucket${vm.populatedRows === 1 ? "" : "s"} built from trades`
      : `Value area spans ${(ratio * 100).toFixed(1)}% of the sampled range across `
        + `${vm.populatedRows} populated price bucket${vm.populatedRows === 1 ? "" : "s"} estimated from candles`,
  };
}

export function deriveProfileDimension(input: DeriveProfileInput): MarketStateDimension {
  const vm = input.vm;
  // See `evidenceGapNote`: only the caller can tell "no volume has been
  // distributed yet" apart from "this venue does not report volume at all".
  const gap = input.evidenceGapNote?.trim() || null;
  // venueBlocked rides with the NOTE, never with the default — see
  // MarketStateDimension.venueBlocked.
  if (!vm) {
    return gap
      ? { ...unknown(gap), venueBlocked: true }
      : unknown("No profile compiled at snapshot time.");
  }

  // The owner's own sentence, not one composed here — two surfaces wording the
  // same silence differently is the defect this whole lane exists to prevent.
  if (!vm.measured) {
    return unknown(gap ?? vm.missingInputNote ?? "No volume has been distributed across price yet.");
  }

  const { poc, vah, val, curve } = vm;
  if (poc == null || vah == null || val == null) {
    return unknown("Profile measured but no value area was published.");
  }

  // The sampled range comes from the curve the panel actually drew, so the
  // ratio is against the same extent the trader is looking at.
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const p of curve) {
    if (!Number.isFinite(p.price)) continue;
    if (p.price < lo) lo = p.price;
    if (p.price > hi) hi = p.price;
  }
  const range = hi - lo;
  if (!(range > 0)) {
    return unknown("Profile measured but every bucket sits at one price — no range to judge value against.");
  }

  const ratio = Math.min(1, Math.max(0, (vah - val) / range));
  const tradeBased = vm.quality === "trade-based";
  const buckets = vm.populatedRows;

  if (buckets < PROFILE_RESOLVE_MIN_BUCKETS) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: confidenceFor(buckets, tradeBased),
      evidence: [evidenceRefFor(input, vm, ratio)],
      contradictions: [],
      unknowns: [
        `Only ${buckets} populated price bucket${buckets === 1 ? "" : "s"} — below the `
        + `${PROFILE_RESOLVE_MIN_BUCKETS}-bucket seal threshold, so no value verdict is claimed.`,
      ],
    };
  }

  if (!tradeBased) {
    return {
      resolution: "PARTIAL",
      value: verdictFor(ratio),
      confidence: confidenceFor(buckets, tradeBased),
      evidence: [evidenceRefFor(input, vm, ratio)],
      contradictions: [],
      // Again the compiler's wording, carried rather than rewritten.
      unknowns: [
        vm.nodesNote
          ?? "This profile was estimated from candles, so high- and low-volume nodes are withheld.",
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: verdictFor(ratio),
    confidence: confidenceFor(buckets, tradeBased),
    evidence: [evidenceRefFor(input, vm, ratio)],
    contradictions: [],
    unknowns: [],
  };
}
