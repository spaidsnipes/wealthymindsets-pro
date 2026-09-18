/**
 * deriveAggressionDimension — how hard the window is being pushed, and what
 * that push is buying.
 *
 * FOUND FROM USE, on production /charts (BTC, 2026-09-17). The Market Object
 * Passport read:
 *
 *   AGGRESSION — UNRESOLVED
 *   "Aggression unresolved — No verified evidence supplied at snapshot time."
 *
 * while the Aggression vs Response view — the Founder's own Asset 03, shipped
 * the same day — was plotting one dot per bar from `selectAggressionResponse`,
 * with a measured efficiency ratio and a named effort basis.
 *
 * This is the FIFTH repair of one shape. ORDER FLOW, VOLATILITY, PROFILE and
 * LOCATION were each hard-coded unresolved beside live evidence before this,
 * and the cause has been identical every time: `chartMarketStatePublisher`
 * listed the dimension as an unconditional string because at the time nothing
 * could measure it, and the line outlived the incapacity that justified it.
 *
 * ── THE ONE THING THIS FILE IS NOT ALLOWED TO SAY ───────────────────────────
 *
 * "Aggression" in its strongest sense means WHO is pushing — buyer-initiated
 * minus seller-initiated. Most feeds do not carry that, and the owner is blunt
 * about it: `aggressionAxis` is `NET_AGGRESSION` only when EVERY bar in the
 * window stated a side, and `EFFORT` otherwise. On /charts today the bars are
 * built with `askVol: null, bidVol: null`, so the axis is EFFORT and
 * `netAggression` is `null`.
 *
 * So this deriver NEVER names a side unless the axis is NET_AGGRESSION. What
 * it can still state honestly on the EFFORT path is the relationship the
 * Founder's framework is actually named after: how much effort the window
 * spent against how much price it bought. That verdict ships at PARTIAL, and
 * the owner's own sentence — "this tape never stated an aggressor side, so the
 * axis shows how much traded rather than who was pushing" — is carried into
 * `unknowns` verbatim.
 *
 * A dimension that says "EFFORT ABSORBED, and I cannot tell you by whom" is
 * strictly more use than one that says nothing. A dimension that says
 * "BUYERS PRESSING" off an unsigned tape is a fabrication.
 *
 * ── WHY IT TAKES A COMPILED VM ──────────────────────────────────────────────
 *
 * Same reason as `deriveProfileDimension` and `deriveLocationDimension`:
 * re-deriving effort here would make this a SECOND owner of the absorption
 * measurement, and the Passport could then seal an efficiency the scatter
 * never plotted. `selectAggressionResponse` decides; this file reads.
 *
 * PURE — no I/O, no clock.
 */

import type {
  AggressionResponseVM,
} from "./viewModels/selectAggressionResponse";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";
import type { MarketFidelityClass } from "./marketEvent";

/**
 * Below this many bars the efficiency ratio is a shape read off too few dots.
 * The window is normalised against its OWN peak, so a three-bar window reads
 * 1.0 by construction whenever those three bars resemble each other.
 */
export const AGGRESSION_RESOLVE_MIN_BARS = 12;

/** The owner's own printed scale: 0 inefficient · 0.5 moderate · 1.0+ efficient. */
export const AGGRESSION_ABSORBED_MAX = 0.5;
export const AGGRESSION_REWARDED_MIN = 1.0;

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * Exported as data because consumers read this dimension BY VALUE. When a
 * producer's words and a matcher's expectations drift apart nothing throws and
 * no test turns red — the guard simply never fires and the surface prints
 * UNKNOWN forever.
 *
 * The first three are effort-vs-response verdicts and are safe on an unsigned
 * tape. The last three name a SIDE and may only be emitted when the owner
 * published a NET_AGGRESSION axis.
 */
export const AGGRESSION_VERDICTS = {
  ABSORBED: "EFFORT ABSORBED",
  MATCHED: "EFFORT MATCHED",
  REWARDED: "EFFORT REWARDED",
  BUYERS: "BUYERS PRESSING",
  SELLERS: "SELLERS PRESSING",
  TWO_SIDED: "TWO-SIDED",
} as const;

export type AggressionVerdict =
  (typeof AGGRESSION_VERDICTS)[keyof typeof AGGRESSION_VERDICTS];

export interface DeriveAggressionInput {
  /** The scatter the room already compiled. Never re-derived here. */
  readonly vm: AggressionResponseVM | null | undefined;
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

/**
 * The basis the owner resolved decides the fidelity word. A tape that stated
 * its sides is DERIVED; one whose sides were reconstructed, or which was read
 * through raw volume as an effort proxy, is INFERRED. `MarketFidelityClass`
 * has published that distinction all along and this lane has mis-set it once
 * before.
 */
function fidelityFor(vm: AggressionResponseVM): MarketFidelityClass {
  return vm.basis === "SIGNED_DELTA" ? "DERIVED" : "INFERRED";
}

function confidenceFor(vm: AggressionResponseVM): number {
  const base = vm.windowBars >= 60 ? 0.7 : vm.windowBars >= 24 ? 0.55 : 0.4;
  // An unsigned window can never outrank a signed one, however many bars it
  // brings. More observations narrow a proxy's sampling error; they do not
  // turn the proxy into an observation.
  return vm.aggressionAxis === "NET_AGGRESSION" ? base : Math.min(base, 0.45);
}

function effortVerdict(efficiency: number): AggressionVerdict {
  if (efficiency < AGGRESSION_ABSORBED_MAX) return AGGRESSION_VERDICTS.ABSORBED;
  if (efficiency >= AGGRESSION_REWARDED_MIN) return AGGRESSION_VERDICTS.REWARDED;
  return AGGRESSION_VERDICTS.MATCHED;
}

function evidenceRefFor(
  input: DeriveAggressionInput,
  vm: AggressionResponseVM,
  efficiency: number,
): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  return {
    eventId: `aggression:effort-response:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    fidelity: fidelityFor(vm),
    // The efficiency figure, the window it was measured over, and the owner's
    // own sentence about what the y-axis actually carries — so the claim can
    // be checked rather than trusted.
    basis: `efficiency ${efficiency.toFixed(2)} over ${vm.windowBars} bar`
      + `${vm.windowBars === 1 ? "" : "s"} (effort basis ${vm.basis}), `
      + vm.aggressionAxisNote,
  };
}

export function deriveAggressionDimension(
  input: DeriveAggressionInput,
): MarketStateDimension {
  const vm = input.vm;
  if (!vm) {
    return unknown("No aggression window compiled at snapshot time.");
  }

  if (!vm.measured) {
    // The compiler already knows why, and its sentence is the honest answer.
    return unknown(
      vm.effortSpreadNote
      ?? "No bar in the window carried measurable effort, so there is no push to describe.",
    );
  }

  const efficiency = vm.efficiency;
  if (efficiency == null) {
    // Dividing by nothing is not a zero — it is an absent measurement.
    return unknown(
      "The window spent no measurable effort, so effort against response cannot be ratioed.",
    );
  }

  const evidence = [evidenceRefFor(input, vm, efficiency)];
  const confidence = confidenceFor(vm);

  if (vm.windowBars < AGGRESSION_RESOLVE_MIN_BARS) {
    return {
      resolution: "PARTIAL",
      // The ratio is stated — those bars really did spend that effort for that
      // movement. What is uncertain is whether the shape survives more of them.
      value: effortVerdict(efficiency),
      confidence,
      evidence,
      contradictions: [],
      unknowns: [
        `The ratio was measured over only ${vm.windowBars} bar`
        + `${vm.windowBars === 1 ? "" : "s"}, below the ${AGGRESSION_RESOLVE_MIN_BARS}-bar seal `
        + "threshold — a window normalised against its own peak reads near 1.0 whenever "
        + "its few bars resemble each other.",
      ],
    };
  }

  if (vm.aggressionAxis !== "NET_AGGRESSION" || vm.netAggression == null) {
    // THE REFUSAL THIS FILE EXISTS TO MAKE. The effort/response reading is
    // real and ships; the SIDE is not knowable from this tape and is not
    // guessed. The owner's sentence explains why, word for word.
    return {
      resolution: "PARTIAL",
      value: effortVerdict(efficiency),
      confidence,
      evidence,
      contradictions: [],
      unknowns: [vm.aggressionAxisNote],
    };
  }

  // Only here — a fully signed window — may a side be named. `netAggression`
  // is summed signed volume; scaling it against the window's own gross push
  // keeps the threshold meaningful across a 5-tick future and a $400 stock.
  const gross = vm.points.reduce((sum, p) => sum + Math.abs(p.aggression), 0);
  if (gross <= 0) {
    return unknown("The window's signed aggression summed to nothing on both sides.");
  }
  const imbalance = vm.netAggression / gross;
  const value: AggressionVerdict =
    imbalance > 0.2 ? AGGRESSION_VERDICTS.BUYERS
    : imbalance < -0.2 ? AGGRESSION_VERDICTS.SELLERS
    : AGGRESSION_VERDICTS.TWO_SIDED;

  return {
    resolution: "RESOLVED",
    value,
    confidence,
    evidence,
    contradictions: [],
    unknowns: [],
  };
}
