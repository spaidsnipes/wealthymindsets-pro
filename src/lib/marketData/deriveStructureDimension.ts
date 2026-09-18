/**
 * deriveStructureDimension — what the confirmed swing sequence is doing, and
 * the standing admission that the newest bars are not in it.
 *
 * FOUND FROM USE, production /charts (BTC, 2026-09-17). The Market Object
 * Passport read:
 *
 *   STRUCTURE — UNRESOLVED
 *   "Structure unresolved — No verified evidence supplied at snapshot time."
 *
 * while the chart beside it was drawing Strong Highs/Lows, Liquidity Pools and
 * Change of Character markers off `swingHighLow` on the very same bars.
 *
 * This is the SIXTH and LAST repair of one shape. ORDER FLOW, VOLATILITY,
 * PROFILE, LOCATION and AGGRESSION were each hard-coded unresolved beside live
 * evidence before it, always for the same reason: the publisher listed the
 * dimension as an unconditional string because at the time nothing could
 * measure it, and the line outlived the incapacity that justified it.
 *
 * With this file shipped, `unresolvedDimensions` holds no unconditional
 * strings at all. Every entry is a verdict about evidence.
 *
 * ── THE ONE THING THIS FILE MUST ALWAYS SAY ─────────────────────────────────
 *
 * The owner's `confirmationLagNote` goes into `unknowns` on EVERY path that
 * states a bias — including the RESOLVED one. That is deliberate and it is the
 * point of the file. A fractal pivot needs `lookback` bars on both sides, so
 * the newest `lookback` bars can never be pivots. The structure reading is
 * therefore always about a market that has already moved past it, and a trader
 * who is not told that will read a confirmed high as a current one.
 *
 * Unlike every other dimension in this lane, the caveat here is not a symptom
 * of a thin window or a poor feed. It is permanent. More bars do not remove it.
 *
 * ── FIDELITY IS CAPPED AT INFERRED, ALWAYS ──────────────────────────────────
 *
 * `swingHighLow` sits under a header that calls itself "Smart Money Concepts
 * (visual, approximate)". The source names its own class; this file does not
 * get to promote it. A pivot is a pattern read off price, not an observation
 * the tape reported.
 *
 * PURE — no I/O, no clock.
 */

import type { MarketStructureVM } from "./viewModels/selectMarketStructure";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

/**
 * Below this many bars the sequence is a shape read off a handful of pivots.
 * The bias compares only the last two of each side, so a short window can flip
 * on a single rotation.
 */
export const STRUCTURE_RESOLVE_MIN_BARS = 40;

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * Exported as data because consumers read this dimension BY VALUE. When a
 * producer's words and a matcher's expectations drift apart nothing throws and
 * no test turns red — the guard simply never fires and the surface prints
 * UNKNOWN forever.
 */
export const STRUCTURE_VERDICTS = {
  HIGHER_HIGHS: "HIGHER HIGHS",
  LOWER_LOWS: "LOWER LOWS",
  RANGE: "ROTATING IN RANGE",
} as const;

export type StructureVerdict =
  (typeof STRUCTURE_VERDICTS)[keyof typeof STRUCTURE_VERDICTS];

export interface DeriveStructureInput {
  /** The sequence the owner already compiled. Never re-detected here. */
  readonly vm: MarketStructureVM | null | undefined;
  readonly source: string | null | undefined;
  readonly latestTickAtMs: number | null;
  readonly capturedAt: number;
  readonly snapshotIdSeed: string;
}

const UNKNOWN_BASE = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
} as const;

function unknown(note: string): MarketStateDimension {
  return { ...UNKNOWN_BASE, unknowns: [note] };
}

const VERDICT_FOR: Readonly<Record<string, StructureVerdict | null>> = {
  HIGHER_HIGHS: STRUCTURE_VERDICTS.HIGHER_HIGHS,
  LOWER_LOWS: STRUCTURE_VERDICTS.LOWER_LOWS,
  RANGE: STRUCTURE_VERDICTS.RANGE,
  UNCLEAR: null,
};

function confidenceFor(vm: MarketStructureVM): number {
  // Capped well below the observed dimensions. A pivot pattern is a reading of
  // price, and more of them narrow sampling error without changing the method.
  return vm.barCount >= 120 ? 0.5 : vm.barCount >= 60 ? 0.42 : 0.35;
}

function evidenceRefFor(
  input: DeriveStructureInput,
  vm: MarketStructureVM,
): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  return {
    eventId: `structure:swing-sequence:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    // The detector names itself "visual, approximate". This file honours that.
    fidelity: "INFERRED",
    // The pivot counts, the lookback they were confirmed at, and the owner's
    // own sentence about the sequence — so the claim can be checked rather
    // than trusted.
    basis: `${vm.swingHighs.length} swing high`
      + `${vm.swingHighs.length === 1 ? "" : "s"} and ${vm.swingLows.length} swing low`
      + `${vm.swingLows.length === 1 ? "" : "s"} confirmed at a ${vm.lookback}-bar lookback `
      + `over ${vm.barCount} bar${vm.barCount === 1 ? "" : "s"} — `
      + vm.biasNote,
  };
}

export function deriveStructureDimension(
  input: DeriveStructureInput,
): MarketStateDimension {
  const vm = input.vm;
  if (!vm) {
    return unknown("No swing sequence compiled at snapshot time.");
  }

  if (!vm.measured) {
    // The compiler already knows why, and its sentence is the honest answer.
    return unknown(
      vm.insufficientNote
      ?? "The window confirmed too few swings for a sequence to be read.",
    );
  }

  const value = VERDICT_FOR[vm.bias] ?? null;
  if (value == null) {
    return unknown(vm.biasNote);
  }

  const evidence = [evidenceRefFor(input, vm)];
  const confidence = confidenceFor(vm);

  // THE CAVEAT THIS FILE EXISTS TO CARRY. It rides every stated verdict,
  // RESOLVED included, because the confirmation lag is permanent rather than a
  // shortage that a longer window would cure.
  const unknowns = [vm.confirmationLagNote];

  if (vm.barCount < STRUCTURE_RESOLVE_MIN_BARS) {
    return {
      resolution: "PARTIAL",
      // The sequence is still stated — those pivots really did print in that
      // order. What is uncertain is whether it survives more rotations.
      value,
      confidence,
      evidence,
      contradictions: [],
      unknowns: [
        ...unknowns,
        `the sequence was read over only ${vm.barCount} bar`
        + `${vm.barCount === 1 ? "" : "s"}, below the ${STRUCTURE_RESOLVE_MIN_BARS}-bar seal `
        + "threshold — a bias drawn from the last two pivots can flip on a single rotation",
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value,
    confidence,
    evidence,
    contradictions: [],
    unknowns,
  };
}
