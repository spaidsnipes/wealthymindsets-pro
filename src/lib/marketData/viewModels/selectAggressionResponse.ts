/**
 * CANON ASSET 03 — AGGRESSION vs RESPONSE FRAMEWORK.
 *
 * The mockup plots one dot per bar: pressure applied on the y-axis, price
 * response on the x-axis. Dots that sit high and near the centre line are bars
 * where a lot of effort bought almost no movement — the visual signature of
 * absorption. It is the same measurement Asset 06 renders as columns, turned
 * ninety degrees so a whole window's worth of bars can be read at once.
 *
 * ── TWO PLACES THE MOCKUP'S ART DIRECTION WOULD BECOME A LIE ─────────────────
 *
 * 1. THE X-AXIS TERM DOES NOT EXIST YET.
 *    The mockup's x-axis is SIGNED displacement in ticks, −10 … +10.
 *    `selectAbsorptionAnatomy` computes `displacement = |close − open|` —
 *    unsigned, in price units — because a zone does not care which way price
 *    went, only how little it went. A scatter DOES care: an up-bar and a
 *    down-bar of equal size are the same dot once you take the absolute value,
 *    and the left/right split is most of what the picture says.
 *
 *    So the signed term is computed HERE, from the same bar inputs, and NOT by
 *    changing the series selector. Zones and effort keep exactly one owner.
 *
 *    Tick size is not carried by the feed either. The axis therefore stays in
 *    PRICE units and says so. Dividing by a guessed tick would put a number on
 *    screen with a unit the feed never stated.
 *
 * 2. THE Y-AXIS IS `NET BUYER / SELLER INITIATED`, WHICH MOST FEEDS DO NOT CARRY.
 *    Live on NQ1! there is no aggressor side at all. A scatter that silently
 *    substituted effort for net aggression would keep its shape and lose its
 *    meaning — the reader would think they were looking at who was pushing when
 *    they were looking at how much traded. So the substitution is a FIELD:
 *    `aggressionAxis` is either NET_AGGRESSION or EFFORT, and the panel prints
 *    the axis label from it. An empty scatter is honest; a relabelled one is not.
 *
 * ── WHAT IS DELIBERATELY NOT BUILT ──────────────────────────────────────────
 *
 * The mockup's right rail carries `CONVICTION HIGH` and
 * `IMPLICATION: SIDEWAYS / REVERSAL RISK`. The first is a grade and §9 applies.
 * The second is a forward-looking prediction and no selector in this repo owns
 * one. `REGIME SIGNAL` is kept, but reduced to the fact underneath it — whether
 * a zone qualified in this window — with no probability attached.
 */

import {
  selectAbsorptionAnatomy,
  type AnatomyBarInput,
  type AbsorptionAnatomyOptions,
  type AbsorptionZone,
  type EffortBasis,
} from "@/lib/marketData/selectAbsorptionAnatomy";

export const AGGRESSION_RESPONSE_VERSION = 1;

/**
 * Which quantity the y-axis actually carries. This is the disclosure that keeps
 * the substitution from being silent, so it is a value, not a boolean.
 */
export type AggressionAxis = "NET_AGGRESSION" | "EFFORT";

/**
 * The mockup's three scatter series. ABSORBING is not a third data source — it
 * is the same bars, flagged, which is why a bar can be recent AND absorbing and
 * the absorbing reading wins: it is the one the picture exists to show.
 */
export type PointClass = "ABSORBING" | "RECENT" | "TYPICAL";

export interface AggressionPoint {
  readonly time: number;
  /**
   * Signed price displacement, `close − open`, in PRICE units. Negative is a
   * down bar. Never divided by a tick size the feed did not state.
   */
  readonly response: number;
  /**
   * The y term. Units depend on `aggressionAxis`: signed contracts/shares under
   * NET_AGGRESSION, a 0..1 fraction of the window's peak under EFFORT.
   */
  readonly aggression: number;
  /** Effort as a fraction of the window's peak. Always present; drives dot size. */
  readonly effortNorm: number;
  readonly cls: PointClass;
}

export interface AggressionResponseVM {
  readonly basis: EffortBasis;
  /** False when no bar carried enough to measure — the scatter is empty. */
  readonly measured: boolean;
  readonly aggressionAxis: AggressionAxis;
  /** One sentence naming what the y-axis carries and, if substituted, why. */
  readonly aggressionAxisNote: string;
  readonly points: readonly AggressionPoint[];
  /**
   * Summed signed aggression across the window, or `null` when the tape did not
   * state a side on EVERY bar. A partial sum is a number with no window.
   */
  readonly netAggression: number | null;
  /** Mean signed displacement in price units. `null` on an empty window. */
  readonly meanResponse: number | null;
  /**
   * The mockup's `EFFICIENCY RATIO (CALCULATED)`: response ÷ aggression, both
   * normalised, so it reads 0 (all effort, no movement) to 1.0+ (movement
   * outran effort). `null` when the window spent no measurable effort, because
   * dividing by nothing is not a zero — it is an absent measurement.
   *
   * NOTE this is NOT the same ratio as `AbsorptionZone.efficiencyRatio`, which
   * is effort-over-displacement and reads > 5.0 as STRONG absorption. They are
   * reciprocal readings of one relationship and they must never be printed
   * under the same label — see `efficiencyScaleNote`.
   *
   * IT IS WINDOW-RELATIVE, AND THAT IS A LIMIT, NOT A DETAIL. Both terms are
   * normalised against THIS window's own peak — which is the only way to make
   * one scale mean the same thing on a 5-tick future and a $400 stock, and the
   * same normalisation Asset 06 uses for its zone ratio. The consequence is
   * that the number compares bars WITHIN a window and says nothing across two.
   * A window of twenty identical bars reads 1.0 whether those bars moved a tick
   * or a dollar, because relative to themselves they all moved the same. The
   * printed note says so, so nobody reads it as a cross-symbol grade.
   */
  readonly efficiency: number | null;
  readonly efficiencyScaleNote: string;
  /** The zones Asset 06 found, unchanged. This view does not re-derive them. */
  readonly zones: readonly AbsorptionZone[];
  readonly windowBars: number;
  /**
   * Passed through from Asset 06, not re-derived. When false, `zones` is empty
   * because the window's effort sits in too few bars for a run to have formed —
   * so the panel must NOT print "no zone qualified" as if that were a reading
   * of the market. See the long note on `AbsorptionAnatomyVM`.
   */
  readonly zoneQualificationPossible: boolean;
  /** The sentence naming that incapacity, or `null` when the window could answer. */
  readonly effortSpreadNote: string | null;
  /** Share of the window's total effort held by its single largest bar, 0..1. */
  readonly effortConcentration: number | null;
}

export interface AggressionResponseOptions extends AbsorptionAnatomyOptions {
  /**
   * How many of the newest bars count as RECENT. The mockup says "Last 50" over
   * a 500-observation lookback — one tenth. Defaulting to a FRACTION rather
   * than the literal 50 keeps the highlight meaningful when the window is 30.
   */
  readonly recentBars?: number;
}

const AXIS_NOTE: Readonly<Record<AggressionAxis, string>> = {
  NET_AGGRESSION:
    "y is net aggression — buyer-initiated minus seller-initiated, as the tape stated it",
  EFFORT:
    "y is EFFORT, not net aggression — this tape never stated an aggressor side, "
    + "so the axis shows how much traded rather than who was pushing",
};

const EFFICIENCY_SCALE_NOTE =
  "response ÷ effort, both normalised against THIS window's own peak · "
  + "0 inefficient (absorption likely) · 0.5 moderate · 1.0+ efficient · "
  + "window-relative — it compares bars inside this window, not one symbol against another";

function meanOf(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

export function selectAggressionResponse(
  input: readonly AnatomyBarInput[],
  options: AggressionResponseOptions = {},
): AggressionResponseVM {
  const anatomy = selectAbsorptionAnatomy(input, options);
  const bars = anatomy.bars;

  // A signed y-axis is only offered when EVERY bar in the window carried a
  // side. One unsigned bar in a signed window would render as a dot sitting on
  // the zero line — indistinguishable from genuine balance, which is the
  // opposite of what it means.
  const signedBars = bars.filter((b) => b.delta != null).length;
  const fullySigned = bars.length > 0 && signedBars === bars.length;
  const aggressionAxis: AggressionAxis = fullySigned ? "NET_AGGRESSION" : "EFFORT";

  const recentBars = options.recentBars ?? Math.max(1, Math.ceil(bars.length / 3));
  const firstRecentIndex = bars.length - recentBars;

  const points: AggressionPoint[] = bars.map((b, i) => ({
    time: b.time,
    response: b.close - b.open,
    aggression: aggressionAxis === "NET_AGGRESSION" ? (b.delta as number) : b.effortNorm,
    effortNorm: b.effortNorm,
    // ABSORBING wins over RECENT deliberately: a recent absorbing bar is the
    // single most informative dot on the chart, and demoting it to the
    // highlight colour would hide the thing the view is for.
    cls: b.absorbing ? "ABSORBING" : i >= firstRecentIndex ? "RECENT" : "TYPICAL",
  }));

  const netAggression = fullySigned
    ? bars.reduce((sum, b) => sum + (b.delta as number), 0)
    : null;

  const meanResponse = meanOf(points.map((p) => p.response));

  // Normalised both sides so the ratio is unit-free and the mockup's 0 → 1.0+
  // scale means the same thing on a 5-tick future and a $400 stock.
  const meanEffortNorm = meanOf(bars.map((b) => b.effortNorm));
  const meanDisplacementNorm = meanOf(bars.map((b) => b.displacementNorm));
  const efficiency =
    meanEffortNorm != null && meanDisplacementNorm != null && meanEffortNorm > 0
      ? meanDisplacementNorm / meanEffortNorm
      : null;

  return {
    basis: anatomy.basis,
    measured: anatomy.measured,
    aggressionAxis,
    aggressionAxisNote: AXIS_NOTE[aggressionAxis],
    points,
    netAggression,
    meanResponse,
    efficiency,
    efficiencyScaleNote: EFFICIENCY_SCALE_NOTE,
    zones: anatomy.zones,
    windowBars: anatomy.windowBars,
    zoneQualificationPossible: anatomy.zoneQualificationPossible,
    effortSpreadNote: anatomy.effortSpreadNote,
    effortConcentration: anatomy.effortConcentration,
  };
}
