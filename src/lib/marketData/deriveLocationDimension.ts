/**
 * deriveLocationDimension — where price stands against the value the auction
 * already built.
 *
 * FOUND FROM USE, measured on production /charts (BTC, 2026-09-17). The Market
 * Object Passport read:
 *
 *   LOCATION — UNRESOLVED
 *   "Location unresolved — No verified evidence supplied at snapshot time."
 *
 * while `selectLivingProfile`, compiled from the same snapshot in the same
 * render, already held `locationNote: "price is ABOVE the value area"`. The
 * evidence was not missing. It was one object away and nobody had asked for it.
 *
 * This is the FOURTH repair of one shape — ORDER FLOW, VOLATILITY and PROFILE
 * were each hard-coded unresolved beside live evidence before this. The cause
 * is always the same: `chartMarketStatePublisher` listed the dimension as an
 * unconditional string because at the time nothing could measure it, and the
 * line outlived the incapacity that justified it.
 *
 * ── WHY LOCATION IS A PROFILE READING AND NOT A PRICE READING ───────────────
 *
 * "Where is price" is not a location. A number on its own has no position —
 * position needs something to be positioned AGAINST. The value area is that
 * reference, and it is the only one on this surface that was measured rather
 * than chosen: VAH and VAL come from where volume actually traded, not from a
 * lookback a settings panel picked.
 *
 * So this deriver takes the compiled Living Profile, exactly as
 * `deriveProfileDimension` does, and for the same reason: re-deriving a value
 * area here would make this a SECOND chooser of tape-vs-bars, and the Passport
 * could then place price against a value area the panel never drew.
 *
 * ── THE WORDING IS CARRIED, NOT COMPOSED ────────────────────────────────────
 *
 * `selectLivingProfile` owns the sentence "price is ABOVE the value area". The
 * verdict here is a MAPPING of that decision, and the owner's sentence is what
 * goes in the evidence basis. Two surfaces wording one fact differently is the
 * defect this whole lane exists to prevent, so this file does not get to
 * rephrase it.
 *
 * PURE — no I/O, no clock. Fabrication safeguards:
 *   - No compiled profile, or no live price → UNKNOWN. A location with nothing
 *     to be located against is not a weak reading, it is not a reading.
 *   - Below the profile's own bucket threshold → PARTIAL, because a value area
 *     drawn from a thin sample is a boundary that will move.
 *   - The candle path is capped below the tape path, same as the profile.
 */

import type { LivingProfileVM } from "./viewModels/selectLivingProfile";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";
import { PROFILE_RESOLVE_MIN_BUCKETS } from "./deriveProfileDimension";

const UNKNOWN_BASE = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
} as const;

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * Exported as data for the same reason the other dimension vocabularies are:
 * consumers read this dimension BY VALUE, and when a producer's words and a
 * matcher's expectations drift apart nothing throws and no test turns red —
 * the guard simply never fires and the surface prints UNKNOWN forever.
 */
export const LOCATION_VERDICTS = {
  ABOVE: "ABOVE VALUE",
  INSIDE: "INSIDE VALUE",
  BELOW: "BELOW VALUE",
} as const;

export type LocationVerdict = (typeof LOCATION_VERDICTS)[keyof typeof LOCATION_VERDICTS];

export interface DeriveLocationInput {
  /** The profile the room already compiled. Never re-derived here. */
  readonly vm: LivingProfileVM | null | undefined;
  readonly source: string | null | undefined;
  readonly latestTickAtMs: number | null;
  readonly capturedAt: number;
  readonly snapshotIdSeed: string;
  /**
   * WHY THERE IS NOTHING TO LOCATE PRICE AGAINST, when the caller knows
   * something this deriver cannot see. See `DeriveAggressionInput` for the
   * live measurement. Optional — absent preserves the previous wording.
   */
  readonly evidenceGapNote?: string | null;
}

function unknown(note: string): MarketStateDimension {
  return { ...UNKNOWN_BASE, unknowns: [note] };
}

function confidenceFor(buckets: number, tradeBased: boolean): number {
  const base = buckets >= 120 ? 0.75 : buckets >= 40 ? 0.55 : 0.35;
  return tradeBased ? base : Math.min(base, 0.4);
}

function evidenceRefFor(
  input: DeriveLocationInput,
  vm: LivingProfileVM,
  note: string,
): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  const tradeBased = vm.quality === "trade-based";
  return {
    eventId: `location:value-area:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    fidelity: tradeBased ? "DERIVED" : "INFERRED",
    // The owner's sentence, verbatim, plus the levels it was judged against so
    // the claim can be checked rather than trusted.
    basis: `${note} (VAL ${vm.val} · VAH ${vm.vah}), `
      + `value built from ${vm.populatedRows} populated price bucket${vm.populatedRows === 1 ? "" : "s"} `
      + `${tradeBased ? "of trades" : "estimated from candles"}`,
  };
}

export function deriveLocationDimension(input: DeriveLocationInput): MarketStateDimension {
  const vm = input.vm;
  const gap = input.evidenceGapNote?.trim() || null;
  if (!vm) {
    // venueBlocked rides with the NOTE, never with the default — see
    // MarketStateDimension.venueBlocked.
    return gap
      ? { ...unknown(gap), venueBlocked: true }
      : unknown(
          "No profile compiled at snapshot time, so price has nothing to be located against.",
        );
  }

  if (!vm.measured) {
    // The compiler's own sentence. It already explains WHY there is no value
    // area, and that explanation is the honest answer to "where is price" —
    // unless the caller can name a cause the compiler could not observe.
    return unknown(
      gap
      ?? vm.missingInputNote
      ?? "No volume has been distributed across price yet, so there is no value area to locate price against.",
    );
  }

  if (vm.vah == null || vm.val == null) {
    return unknown("Profile measured but no value area was published, so price cannot be placed against it.");
  }

  if (vm.livePrice == null) {
    // A value area with no price is half a reading. Naming which half is
    // missing is what lets the trader fix it.
    return unknown("A value area exists but no live price was available to place against it.");
  }

  // The owner already decided this. Read, do not re-decide.
  const note = vm.locationNote;
  if (!note) {
    return unknown("The profile published no location for the current price.");
  }

  const verdict: LocationVerdict =
    vm.livePrice > vm.vah ? LOCATION_VERDICTS.ABOVE
    : vm.livePrice < vm.val ? LOCATION_VERDICTS.BELOW
    : LOCATION_VERDICTS.INSIDE;

  const tradeBased = vm.quality === "trade-based";
  const buckets = vm.populatedRows;
  const evidence = [evidenceRefFor(input, vm, note)];
  const confidence = confidenceFor(buckets, tradeBased);

  if (buckets < PROFILE_RESOLVE_MIN_BUCKETS) {
    return {
      resolution: "PARTIAL",
      // The side is still stated. Price really is above or below the boundary
      // that was drawn — what is uncertain is whether that boundary will hold
      // as the sample fills in, and that is what the unknown says.
      value: verdict,
      confidence,
      evidence,
      contradictions: [],
      unknowns: [
        `The value area was built from only ${buckets} populated price bucket${buckets === 1 ? "" : "s"}, `
        + `below the ${PROFILE_RESOLVE_MIN_BUCKETS}-bucket seal threshold — its edges may move as the sample fills in.`,
      ],
    };
  }

  if (!tradeBased) {
    return {
      resolution: "PARTIAL",
      value: verdict,
      confidence,
      evidence,
      contradictions: [],
      unknowns: [
        "The value area this position is measured against was estimated from candles, not counted from trades.",
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: verdict,
    confidence,
    evidence,
    contradictions: [],
    unknowns: [],
  };
}
