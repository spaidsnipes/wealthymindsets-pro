/**
 * LIQUIDITY WEATHER — what it is costing to move this market, and whether
 * that cost is rising or falling.
 *
 * WHAT THIS MODULE IS ALLOWED TO CLAIM
 *
 * A trade tape carries prints, not a book. It cannot see resting orders, so it
 * cannot say how deep the bid is. What it CAN say is the only thing a trader
 * ever actually pays for: how much size went through to move price a given
 * distance. That quantity — volume per unit of travel — is a real, observed
 * cost, and its RISE or FALL across a window is this module's finding.
 *
 * Four ways that finding could be manufactured cheaply, each refused below:
 *
 *   · by measuring travel in ticks or cents, so the same cost reads "thin" on
 *     one instrument and "thick" on the next. Travel here is measured in the
 *     window's own volume-weighted spread, the same scale the value candle and
 *     the absorption panel use.
 *
 *   · by dividing by zero travel. A segment where every print landed at one
 *     price is not infinitely thick — it is a segment whose cost cannot be
 *     divided out at all. It is carried as `stalled`, never as a number.
 *
 *   · by calling noise a trend. Any window has two halves and one of them is
 *     always cheaper, so "liquidity is thinning" is free unless something
 *     stops it. What stops it here is a coherence test: if too many segments
 *     disagree with their own half, this module says ERRATIC rather than
 *     picking the half it prefers.
 *
 *   · by borrowing the absorption panel's authority. This module never reads
 *     `side`. It works identically on a tape whose aggressor is venue-stamped
 *     and one whose aggressor is a tick-rule guess, because it asks a question
 *     that does not depend on who initiated. It therefore demands no aggressor
 *     disclosure — and that is a claim about its OWN inputs, not a loophole.
 *
 * ORDER: segments are equal-COUNT buckets of prints in tape order. Callers owe
 * this selector prints in the order the tape produced them.
 */

import {
  selectAggressorFlow,
  type AggressorTick,
  type AggressorProvenance,
} from "../selectAggressorFlow";
import { selectValueCandle } from "./selectValueCandle";
import { formatMagnitude, formatRatio, roundSig } from "./measuredNumber";

export const LIQUIDITY_WEATHER_VERSION = "wm.liquidity-weather.v1" as const;

/**
 * Seven stages, and one of them is a refusal. UNMEASURED is not a weather
 * condition — it is this module declining to report one.
 */
export type WeatherStage =
  | "AIRLESS"
  | "THINNING"
  | "STEADY"
  | "THICKENING"
  | "HEAVY"
  | "ERRATIC"
  | "UNMEASURED";

export interface LiquiditySegment {
  readonly index: number;
  readonly volume: number;
  readonly prints: number;
  readonly high: number;
  readonly low: number;
  /** Travel in price. Zero when every print in the segment landed together. */
  readonly range: number;
  /** Travel in units of the window's volume-weighted spread. */
  readonly rangeInSpread: number | null;
  /**
   * Size required to travel one spread. Null when the segment did not travel —
   * a cost with no distance to divide by is not a small number, it is no
   * number.
   */
  readonly cost: number | null;
  /** True when the segment traded without moving at all. */
  readonly stalled: boolean;
}

export interface LiquidityWeatherVM {
  readonly version: typeof LIQUIDITY_WEATHER_VERSION;
  readonly stage: WeatherStage;
  readonly segments: readonly LiquiditySegment[];
  /** The window's volume-weighted price spread — the scale everything uses. */
  readonly spread: number | null;
  /** Median cost across measurable segments. The window's own reference. */
  readonly medianCost: number | null;
  /** Cost of the most recent measurable segment. */
  readonly latestCost: number | null;
  /** latestCost / medianCost. Published as context; not what names a stage. */
  readonly latestVsMedian: number | null;
  /**
   * latestCost over the median of the OTHER segments in the same half. This,
   * not `latestVsMedian`, is what makes a segment an outlier: a window that
   * steps cleanly from dear to cheap has a cheap LAST segment, but it is not
   * an outlier — it is a trend, and calling it a vacuum would be a different
   * and louder claim than the tape supports.
   */
  readonly latestVsPeers: number | null;
  /** Late-half median over early-half median. Above 1 means thickening. */
  readonly trendRatio: number | null;
  /**
   * Share of segments sitting more than `OUTLIER_FACTOR` from their OWN HALF's
   * median — not the whole window's. A window that steps from dear to cheap has
   * enormous whole-window scatter and is perfectly orderly; measuring within
   * halves asks the only question that matters, which is whether the two halves
   * are each coherent enough to be compared at all.
   */
  readonly dispersion: number | null;
  readonly provenance: AggressorProvenance;
  /**
   * Always false. Kept on the shape so a surface that renders several of these
   * selectors side by side does not have to special-case this one — and so the
   * reason is stated where it can be tested rather than only in a comment.
   */
  readonly requiresDisclosure: false;
  readonly detail: string;
}

export const LIQUIDITY_SEGMENTS = 12;
export const LIQUIDITY_MIN_PRINTS = 24;
/** Latest segment this much cheaper than the window's median reads AIRLESS. */
export const AIRLESS_RATIO = 0.4;
/** Latest segment this much dearer than the window's median reads HEAVY. */
export const HEAVY_RATIO = 2.5;
/** Half-over-half ratio needed before a trend may be named at all. */
export const TREND_RATIO = 1.5;
/** A segment this far from its half's median is disagreeing with its neighbours. */
export const OUTLIER_FACTOR = 2;
/** This share of disagreeing segments means the halves cannot be compared. */
export const ERRATIC_DISPERSION = 0.4;

interface Print {
  readonly price: number;
  readonly size: number;
}

/**
 * Trade prints only, and only those carrying a usable price and a positive
 * size. Quotes are not executions; a zero-size print bought nothing and must
 * not dilute a cost that is denominated in size.
 */
function tradePrints(ticks: readonly AggressorTick[]): Print[] {
  const out: Print[] = [];
  for (const t of ticks) {
    if (t?.trade !== true) continue;
    const price = typeof t.price === "number" ? t.price : NaN;
    const size = typeof t.size === "number" ? t.size : NaN;
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) continue;
    out.push({ price, size });
  }
  return out;
}

/**
 * The SHARE of segments sitting more than `OUTLIER_FACTOR` away from their own
 * half's median, in either direction.
 *
 * A count, not a magnitude — and the third statistic tried here, because the
 * first two both answered the wrong question. A mean deviation cannot tell one
 * odd segment from a window that is odd throughout: on a real tape the segment
 * where one regime hands over to the next is always mixed, and that single
 * segment was enough to drag a mean past any threshold. A median deviation
 * fixed that and then went blind to a window alternating cheap and dear every
 * segment, because with half the sample on each side the median deviation is
 * zero.
 *
 * "How MANY segments disagree with their neighbourhood" separates those two
 * cleanly, and it is the question ERRATIC actually asks. It also says
 * something a reader can check by eye against the segment bars.
 */
function incoherentShare(values: readonly number[]): number {
  if (values.length < 3) return 0;
  const m = median(values);
  if (m == null || !(m > 0)) return 0;
  const off = values.filter((v) => v > m * OUTLIER_FACTOR || v < m / OUTLIER_FACTOR).length;
  return off / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function empty(
  detail: string,
  provenance: AggressorProvenance,
  segments: readonly LiquiditySegment[] = [],
  spread: number | null = null,
): LiquidityWeatherVM {
  return {
    version: LIQUIDITY_WEATHER_VERSION,
    stage: "UNMEASURED",
    segments,
    spread,
    medianCost: null,
    latestCost: null,
    latestVsMedian: null,
    latestVsPeers: null,
    trendRatio: null,
    dispersion: null,
    provenance,
    requiresDisclosure: false,
    detail,
  };
}

export function selectLiquidityWeather(
  ticks: readonly AggressorTick[] | null | undefined,
  segmentCount: number = LIQUIDITY_SEGMENTS,
): LiquidityWeatherVM {
  const flow = selectAggressorFlow(ticks ?? []);
  const provenance = flow.provenance;

  if (!ticks || ticks.length === 0) {
    return empty("No prints in this window — there is no cost to measure.", provenance);
  }

  const prints = tradePrints(ticks);
  if (prints.length < LIQUIDITY_MIN_PRINTS) {
    return empty(
      `${prints.length} usable trade print${prints.length === 1 ? "" : "s"} — ` +
        `at least ${LIQUIDITY_MIN_PRINTS} are needed before a cost trend means anything.`,
      provenance,
    );
  }

  const candle = selectValueCandle(prints);
  const spread = candle.spread;
  if (spread == null || !(spread > 0)) {
    return empty(
      "Every print in this window landed at one price. Nothing travelled, so " +
        "there is no distance to divide size by.",
      provenance,
      [],
      spread,
    );
  }

  const n = Math.max(2, Math.min(segmentCount, Math.floor(prints.length / 2)));
  const segments: LiquiditySegment[] = [];
  const per = prints.length / n;
  for (let i = 0; i < n; i++) {
    const from = Math.floor(i * per);
    const to = i === n - 1 ? prints.length : Math.floor((i + 1) * per);
    const slice = prints.slice(from, to);
    if (slice.length === 0) continue;
    let volume = 0;
    let high = -Infinity;
    let low = Infinity;
    for (const p of slice) {
      volume += p.size;
      if (p.price > high) high = p.price;
      if (p.price < low) low = p.price;
    }
    const range = high - low;
    const rangeInSpread = range > 0 ? roundSig(range / spread) : null;
    segments.push({
      index: i,
      volume: roundSig(volume, 6),
      prints: slice.length,
      high: roundSig(high, 8),
      low: roundSig(low, 8),
      range: roundSig(range, 6),
      rangeInSpread,
      cost: rangeInSpread != null && rangeInSpread > 0 ? roundSig(volume / rangeInSpread) : null,
      stalled: range <= 0,
    });
  }

  const costs = segments.map((s) => s.cost).filter((c): c is number => c != null);
  const med = median(costs);
  if (med == null || !(med > 0)) {
    return empty(
      "No segment in this window travelled far enough to price. The tape moved " +
        "size without moving price at all.",
      provenance,
      segments,
      spread,
    );
  }

  const last = segments[segments.length - 1];
  const latestCost = last.cost;
  const latestVsMedian = latestCost != null ? roundSig(latestCost / med) : null;

  const half = Math.floor(segments.length / 2);
  const earlyCosts = segments
    .slice(0, half)
    .map((s) => s.cost)
    .filter((c): c is number => c != null);
  const lateCosts = segments
    .slice(half)
    .map((s) => s.cost)
    .filter((c): c is number => c != null);
  const earlyMed = median(earlyCosts);
  const lateMed = median(lateCosts);
  const trendRatio =
    earlyMed != null && lateMed != null && earlyMed > 0 ? roundSig(lateMed / earlyMed) : null;

  /**
   * THE SEGMENT UNDER JUDGEMENT IS NOT PART OF THE COURT. Everything below is
   * computed from the window WITHOUT its last segment, because the last
   * segment is the thing being judged. Leaving it in is not a rounding
   * concern — it is self-refuting: a genuine vacuum inflates the scatter of
   * its own half, that scatter trips ERRATIC, and ERRATIC then suppresses the
   * very vacuum reading the segment was evidence for. The louder the finding,
   * the more effectively it would erase itself.
   */
  const priorLate = latestCost != null ? lateCosts.slice(0, -1) : lateCosts;

  /**
   * Incoherence WITHIN each half, judged against that half's own median, and
   * the worse of the two wins. Measuring about the whole window's median instead would
   * report a clean dear-to-cheap step as maximally noisy, which is the exact
   * opposite of what it is. The question this number answers is not "did the
   * cost vary" — of course it did — but "is each half coherent enough that
   * comparing them means anything".
   */
  const dispersion = roundSig(
    Math.max(incoherentShare(earlyCosts), incoherentShare(priorLate)),
  );

  /**
   * An outlier is judged against its NEIGHBOURS, not against the window. The
   * last segment of an orderly step-down is the cheapest segment in the window
   * and is not an outlier at all; the last segment of a steady window that
   * suddenly emptied is.
   */
  const peers = median(priorLate);
  const latestVsPeers =
    latestCost != null && peers != null && peers > 0 ? roundSig(latestCost / peers) : null;

  /**
   * Order of the ladder, and why:
   *
   *   stalled  — a fact, not a comparison. Nothing outranks it.
   *   ERRATIC  — an observation ABOUT THE WINDOW. If the halves are incoherent
   *              then every reading below is drawn from a sample that cannot
   *              support it, including the outlier test.
   *   AIRLESS / HEAVY — an observation about the segment that just closed.
   *   THINNING / THICKENING — an inference about a direction. An inference must
   *              never outrank an observation.
   */
  let stage: WeatherStage;
  let detail: string;

  if (last.stalled) {
    stage = "HEAVY";
    detail =
      `The last segment traded ${formatMagnitude(last.volume)} without moving price at all. ` +
      `Whatever is sitting there absorbed everything that hit it.`;
  } else if (dispersion >= ERRATIC_DISPERSION) {
    stage = "ERRATIC";
    detail =
      `${(dispersion * 100).toFixed(0)}% of segments disagree with their own half by ` +
      `more than ${OUTLIER_FACTOR}×. This window is not coherent enough to compare, ` +
      `so no trend is named.`;
  } else if (latestVsPeers != null && latestVsPeers >= HEAVY_RATIO) {
    stage = "HEAVY";
    detail =
      `Moving one spread just cost ${formatRatio(latestVsPeers)}× what it cost in the ` +
      `segments either side of it. Size is going in and getting little back.`;
  } else if (latestVsPeers != null && latestVsPeers <= AIRLESS_RATIO) {
    stage = "AIRLESS";
    detail =
      `One spread just cost ${formatRatio(latestVsPeers)}× what its neighbours paid. ` +
      `Price is travelling on very little — there is not much in the way.`;
  } else if (trendRatio != null && trendRatio >= TREND_RATIO) {
    stage = "THICKENING";
    detail =
      `The second half of this window cost ${formatRatio(trendRatio)}× the first to move ` +
      `the same distance. Liquidity is building back in.`;
  } else if (trendRatio != null && trendRatio <= 1 / TREND_RATIO) {
    stage = "THINNING";
    detail =
      `The second half of this window cost ${formatRatio(trendRatio)}× the first to move ` +
      `the same distance. It is getting cheaper to push this market.`;
  } else {
    stage = "STEADY";
    detail =
      `Cost to travel one spread has held near ${formatMagnitude(med)} across the window. ` +
      `No build-up and no vacuum.`;
  }

  return {
    version: LIQUIDITY_WEATHER_VERSION,
    stage,
    segments,
    spread: roundSig(spread, 6),
    medianCost: roundSig(med),
    latestCost,
    latestVsMedian,
    latestVsPeers,
    trendRatio,
    dispersion,
    provenance,
    requiresDisclosure: false,
    detail,
  };
}

/**
 * `formatRatio` and `formatCost` are RE-EXPORTED here, not defined here.
 *
 * They used to live in this file, and that is exactly how the product ended up
 * with three different answers to "render a number whose scale belongs to the
 * instrument" — `toFixed(0)` here, `toFixed(2)` and `toExponential(2)` over in
 * the absorption panel, plus a byte-for-byte duplicate of `roundSig` in
 * `selectAbsorption.ts` under its own copy of the same explanation. Both wrong
 * answers were caught on PRODUCTION, not in review.
 *
 * So the owner is now `./measuredNumber`, and this module is one of its
 * callers. The names stay exported from here because this module's public
 * surface is part of the contract its panel already imports: moving the owner
 * is not a reason to make every consumer re-decide where to import from, and
 * a second CALLER of one owner is fine — a second ANSWER is not.
 */
export { formatRatio } from "./measuredNumber";
export { formatMagnitude as formatCost } from "./measuredNumber";
