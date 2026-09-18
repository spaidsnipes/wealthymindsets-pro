/**
 * selectAbsorptionAnatomyView — the compiler behind the Founder's Asset 06
 * (ABSORPTION ANATOMY) as a FULL VIEW, not as a drawer tile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SECOND MODULE, WHEN `selectAbsorptionAnatomy` ALREADY EXISTS
 *
 * `selectAbsorptionAnatomy` publishes the SERIES — per-bar effort, per-bar
 * displacement, and the zones they imply. That is the centre column of the
 * mockup and nothing else. The mockup has three columns:
 *
 *   LEFT    RAW AGGRESSION METRICS — buyer / seller initiated volume, each as
 *           a share of total, and the aggression delta across the window.
 *   CENTRE  EFFORT vs PRICE DISPLACEMENT, the absorption band, the ratio.
 *   RIGHT   ABSORPTION CHARACTERISTICS — a five-item diagnostic checklist —
 *           and a CURRENT CONVICTION gauge.
 *
 * The left and right columns are readings ABOUT the series, and every one of
 * them has a different honesty profile from the series itself. Putting that
 * arithmetic in the view component would make the component the owner of
 * several truth claims, which is exactly the drift `AbsorptionAnatomyPanel`
 * was just repaired for. So the composition is compiled here, pure, and the
 * view renders what it is handed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS DELIBERATELY NOT BUILT
 *
 * The approved mockup prints `CONVICTION 82%`, `18,732`, `−2,552`, `7.42` and
 * `98.7th percentile`. Those are ART DIRECTION. There is no probability model
 * anywhere in this codebase that produces an 82, and inventing one so the
 * screen matches the picture is the precise failure LIVING-PIXEL LAW exists to
 * prevent. Conviction therefore ships as the REAL `AbsorptionStrength`
 * (STRONG / MODERATE / WEAK) with the gauge filled from the efficiency ratio's
 * actual position on the code's own ladder — a derived mapping, defensible,
 * and traceable back to `strengthOfRatio`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY EVERY LEFT-RAIL FIGURE IS NULLABLE
 *
 * Buyer- and seller-initiated volume require a per-trade aggressor side. Most
 * feeds this product is wired to do not carry one — live NQ1! reports the
 * window's basis as VOLUME, meaning "effort is real traded volume, unsigned".
 * Under that basis a buyer-initiated total DOES NOT EXIST, and the number the
 * surface must print is an em dash, never a zero. A zero asserts that a count
 * was taken. The absence of a stated side is not a count of none.
 *
 * PURE. No clock, no I/O, no chart handle.
 */

import {
  selectAbsorptionAnatomy,
  type AbsorptionAnatomyOptions,
  type AbsorptionAnatomyVM,
  type AbsorptionStrength,
  type AbsorptionZone,
  type AnatomyBar,
  type AnatomyBarInput,
  type EffortBasis,
} from "@/lib/marketData/selectAbsorptionAnatomy";

export const ABSORPTION_ANATOMY_VIEW_VERSION = 1;

/**
 * Whether a diagnostic criterion was met, missed, or could not be asked.
 *
 * UNMEASURED is not a soft NOT_MET. "Imbalance persistence" on a tape with no
 * aggressor side is not a failed test — it is a test that was never run, and
 * a surface that renders it as a failed test tells the trader the market
 * answered when it did not.
 */
export type CriterionState = "MET" | "NOT_MET" | "UNMEASURED";

export interface AbsorptionCriterion {
  /** The mockup's own label. */
  readonly label: string;
  readonly state: CriterionState;
  /** What the state was decided from. Never empty, in any state. */
  readonly basis: string;
}

export interface AggressionRail {
  /** Aggressor-buy volume across the window, or null when the tape is unsigned. */
  readonly buyInitiated: number | null;
  readonly sellInitiated: number | null;
  /** Share of total aggressive volume, 0..1. Null whenever the totals are null. */
  readonly buyShare: number | null;
  readonly sellShare: number | null;
  /** buyInitiated − sellInitiated across the whole window. */
  readonly netDelta: number | null;
  /** Per-bar signed aggression for the sparkline. Entries are null on an unsigned tape. */
  readonly deltaSeries: readonly (number | null)[];
  /** Total traded volume across the window, when the bars carried it. */
  readonly totalVolume: number | null;
}

export interface ConvictionReading {
  /** The REAL strength word. Null when no zone qualified. */
  readonly strength: AbsorptionStrength | null;
  readonly ratio: number | null;
  readonly unbounded: boolean;
  /**
   * The ratio's position on the code's own STRONG/MODERATE/WEAK ladder, 0..1,
   * for filling the gauge arc. Null when there is no zone to place. This is a
   * RENDERING coordinate derived from a real measurement — it is never printed
   * as a percentage, because it is not one.
   */
  readonly ladderFill: number | null;
}

export interface AbsorptionAnatomyViewVM {
  readonly version: number;
  readonly basis: EffortBasis;
  readonly measured: boolean;
  readonly windowBars: number;
  readonly bars: readonly AnatomyBar[];
  readonly zones: readonly AbsorptionZone[];
  /** The zone the checklist and the gauge describe: the most recent one. */
  readonly focusZone: AbsorptionZone | null;
  readonly aggression: AggressionRail;
  readonly checklist: readonly AbsorptionCriterion[];
  readonly conviction: ConvictionReading;
  /** One honest line about the whole view. Never empty, in any state. */
  readonly reason: string;
}

const BASIS_LINE: Record<EffortBasis, string> = {
  SIGNED_DELTA: "effort is provider-stated aggressor delta",
  INFERRED_DELTA: "effort is aggressor delta, partly reconstructed by heuristic",
  VOLUME: "effort is traded volume — this tape never stated an aggressor side",
  UNMEASURED: "no volume and no aggressor side observed — nothing to measure",
};

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Place a ratio on the mockup's own ladder as a 0..1 fill.
 *
 * The ladder is `< 2.0 WEAK · 2.0–5.0 MODERATE · > 5.0 STRONG`, so the three
 * bands take a third of the arc each. Above 5.0 the ratio is unbounded, so the
 * top band approaches 1 asymptotically rather than clamping — a gauge pinned
 * at full for everything over 5 would erase the difference between 5.1 and 40.
 */
export function ladderFillOf(ratio: number | null, unbounded: boolean): number | null {
  if (unbounded) return 1;
  if (ratio == null || !Number.isFinite(ratio) || ratio < 0) return null;
  const THIRD = 1 / 3;
  if (ratio < 2) return (ratio / 2) * THIRD;
  if (ratio <= 5) return THIRD + ((ratio - 2) / 3) * THIRD;
  return 2 * THIRD + (1 - 5 / ratio) * THIRD;
}

/** The bars a zone spans, by time, inclusive of both ends. */
function barsOfZone(bars: readonly AnatomyBar[], zone: AbsorptionZone): readonly AnatomyBar[] {
  return bars.filter(b => b.time >= zone.startTime && b.time <= zone.endTime);
}

/**
 * IMBALANCE PERSISTENCE — "aggression stays one-sided through the zone".
 *
 * Only askable when the bars carry a signed delta. On an unsigned tape every
 * `delta` is null and the answer is UNMEASURED, not "no".
 */
function imbalancePersistence(zoneBars: readonly AnatomyBar[]): AbsorptionCriterion {
  const signed = zoneBars.filter(b => b.delta != null && b.delta !== 0);
  if (zoneBars.length === 0) {
    return {
      label: "Imbalance persistence",
      state: "UNMEASURED",
      basis: "no zone to test",
    };
  }
  if (signed.length === 0) {
    return {
      label: "Imbalance persistence",
      state: "UNMEASURED",
      basis: "aggressor side is not stated on this tape — the test cannot be run",
    };
  }
  const first = Math.sign(signed[0]!.delta!);
  const held = signed.every(b => Math.sign(b.delta!) === first);
  return {
    label: "Imbalance persistence",
    state: held ? "MET" : "NOT_MET",
    basis: held
      ? `delta kept the same sign across ${signed.length} of ${zoneBars.length} bars`
      : `delta changed sign inside the zone`,
  };
}

/**
 * VOLUME SHELF — "more volume rested here than the zone's width would predict".
 *
 * The mockup points at the volume profile for this. The profile is drawn on the
 * chart by another owner, so rather than reach for it, this asks the same
 * question of the window that is already in hand: did the zone's bars carry a
 * larger SHARE of the window's volume than their share of its bars? That is a
 * real shelf test, computable from the inputs, and it is stated as such.
 */
function volumeShelf(
  inputs: readonly AnatomyBarInput[],
  zone: AbsorptionZone | null,
  windowBarCount: number,
): AbsorptionCriterion {
  const label = "Volume shelf";
  if (zone == null) return { label, state: "UNMEASURED", basis: "no zone to test" };

  let windowVolume = 0;
  let zoneVolume = 0;
  let zoneBars = 0;
  let carried = false;
  for (const bar of inputs) {
    if (!finite(bar.volume) || bar.volume <= 0) continue;
    carried = true;
    windowVolume += bar.volume;
    if (bar.time >= zone.startTime && bar.time <= zone.endTime) {
      zoneVolume += bar.volume;
      zoneBars += 1;
    }
  }
  if (!carried || windowVolume <= 0 || windowBarCount <= 0 || zoneBars <= 0) {
    return { label, state: "UNMEASURED", basis: "no per-bar volume on this tape" };
  }
  const volumeShare = zoneVolume / windowVolume;
  const barShare = zoneBars / windowBarCount;
  const met = volumeShare > barShare;
  return {
    label,
    state: met ? "MET" : "NOT_MET",
    basis: `${(volumeShare * 100).toFixed(1)}% of window volume in ${(barShare * 100).toFixed(1)}% of its bars`,
  };
}

function buildChecklist(
  anatomy: AbsorptionAnatomyVM,
  inputs: readonly AnatomyBarInput[],
  zone: AbsorptionZone | null,
  minZoneBars: number,
): readonly AbsorptionCriterion[] {
  const zoneBars = zone ? barsOfZone(anatomy.bars, zone) : [];

  const highEffort: AbsorptionCriterion = zone
    ? {
        label: "High effort",
        state: "MET",
        basis: `peak effort ${(Math.max(...zoneBars.map(b => b.effortNorm)) * 100).toFixed(0)}% of the window's own maximum`,
      }
    : { label: "High effort", state: "NOT_MET", basis: "no bar in this window paired high effort with weak displacement" };

  const weakDisplacement: AbsorptionCriterion = zone
    ? {
        label: "Weak displacement",
        state: "MET",
        basis: `largest move in the zone was ${(Math.max(...zoneBars.map(b => b.displacementNorm)) * 100).toFixed(0)}% of the window's own maximum`,
      }
    : { label: "Weak displacement", state: "NOT_MET", basis: "price kept following the effort spent" };

  const timeExtension: AbsorptionCriterion = zone
    ? {
        label: "Time extension",
        state: zone.barCount >= minZoneBars ? "MET" : "NOT_MET",
        basis: `held ${zone.barCount} bars (a zone needs ${minZoneBars})`,
      }
    : { label: "Time extension", state: "NOT_MET", basis: "no run of bars held long enough to be a zone" };

  return [
    highEffort,
    weakDisplacement,
    timeExtension,
    imbalancePersistence(zoneBars),
    volumeShelf(inputs, zone, anatomy.windowBars),
  ];
}

function buildAggressionRail(
  inputs: readonly AnatomyBarInput[],
  anatomy: AbsorptionAnatomyVM,
): AggressionRail {
  let buy = 0;
  let sell = 0;
  let signedBars = 0;
  let volume = 0;
  let volumeBars = 0;

  for (const bar of inputs) {
    if (finite(bar.askVol) && finite(bar.bidVol) && bar.askVol + bar.bidVol > 0) {
      buy += bar.askVol;
      sell += bar.bidVol;
      signedBars += 1;
    }
    if (finite(bar.volume) && bar.volume > 0) {
      volume += bar.volume;
      volumeBars += 1;
    }
  }

  // A PARTIALLY signed window is not a buyer-initiated total. Summing the bars
  // that happened to carry a split and printing it beside a window-wide label
  // would silently answer a narrower question than the one asked. The rail is
  // populated only when every bar in the window carried a side.
  const fullySigned = signedBars > 0 && signedBars === inputs.length;
  const total = buy + sell;

  return {
    buyInitiated: fullySigned ? buy : null,
    sellInitiated: fullySigned ? sell : null,
    buyShare: fullySigned && total > 0 ? buy / total : null,
    sellShare: fullySigned && total > 0 ? sell / total : null,
    netDelta: fullySigned ? buy - sell : null,
    deltaSeries: anatomy.bars.map(b => b.delta),
    totalVolume: volumeBars > 0 ? volume : null,
  };
}

const EMPTY: AbsorptionAnatomyViewVM = {
  version: ABSORPTION_ANATOMY_VIEW_VERSION,
  basis: "UNMEASURED",
  measured: false,
  windowBars: 0,
  bars: [],
  zones: [],
  focusZone: null,
  aggression: {
    buyInitiated: null,
    sellInitiated: null,
    buyShare: null,
    sellShare: null,
    netDelta: null,
    deltaSeries: [],
    totalVolume: null,
  },
  checklist: [],
  conviction: { strength: null, ratio: null, unbounded: false, ladderFill: null },
  reason: BASIS_LINE.UNMEASURED,
};

export function selectAbsorptionAnatomyView(
  input: readonly AnatomyBarInput[] | null | undefined,
  options: AbsorptionAnatomyOptions = {},
): AbsorptionAnatomyViewVM {
  const anatomy = selectAbsorptionAnatomy(input, options);
  if (!anatomy.measured || anatomy.bars.length === 0) return EMPTY;

  const windowBars = options.windowBars ?? 30;
  const inputs = (input ?? []).slice(windowBars > 0 ? -windowBars : 0);
  const minZoneBars = options.minZoneBars ?? 2;

  // THE MOST RECENT zone, not the strongest. The gauge is labelled CURRENT
  // CONVICTION in the mockup, and a surface that quietly promotes the best
  // zone in the window to "current" is telling the trader that the thing they
  // are looking at right now is stronger than it is.
  const focusZone = anatomy.zones.length > 0 ? anatomy.zones[anatomy.zones.length - 1]! : null;

  const aggression = buildAggressionRail(inputs, anatomy);

  const reason =
    focusZone == null
      ? `${BASIS_LINE[anatomy.basis]} — no absorption zone in the last ${anatomy.windowBars} bars`
      : `${BASIS_LINE[anatomy.basis]} — ${focusZone.barCount} bars absorbed between ${focusZone.priceLo} and ${focusZone.priceHi}`;

  return {
    version: ABSORPTION_ANATOMY_VIEW_VERSION,
    basis: anatomy.basis,
    measured: true,
    windowBars: anatomy.windowBars,
    bars: anatomy.bars,
    zones: anatomy.zones,
    focusZone,
    aggression,
    checklist: buildChecklist(anatomy, inputs, focusZone, minZoneBars),
    conviction: {
      strength: focusZone ? focusZone.strength : null,
      ratio: focusZone ? focusZone.efficiencyRatio : null,
      unbounded: focusZone ? focusZone.unbounded : false,
      ladderFill: focusZone ? ladderFillOf(focusZone.efficiencyRatio, focusZone.unbounded) : null,
    },
    reason,
  };
}
