/**
 * selectDeltaDivergence — "Did the delta follow price to the new high?"
 *
 * ── THE QUESTION ─────────────────────────────────────────────────────────────
 *
 * The Founder's Delta Divergence panel draws two lines and asks whether they
 * point the same way. Price makes a higher high; if cumulative delta does NOT
 * make a higher high with it, the second push was bought by fewer aggressive
 * buyers than the first. The market went further on less fuel.
 *
 * That is a real and useful reading, and it is also the single most abused
 * pattern in retail order-flow software, because a divergence can be
 * manufactured out of any tape by choosing the two points you compare. This
 * module therefore spends most of its length on the choosing.
 *
 * ── WHAT MAKES A DIVERGENCE REAL ────────────────────────────────────────────
 *
 * 1. TWO PIVOTS, FOUND BY A STATED RULE. A divergence is a COMPARISON, so it
 *    needs two comparable points. One pivot is not a finding, and "the highest
 *    bar" is not a pivot — it is an extreme. The pivots here are local extrema
 *    of equal-count segments of the tape, found by a fractal rule written down
 *    in `findPivots` and applied identically to highs and lows.
 *
 * 2. THE SWING MUST CLEAR THE WINDOW'S OWN NOISE. Any two adjacent segments
 *    differ by SOMETHING. A "higher high" that is smaller than the window's own
 *    volume-weighted spread is not a higher high; it is the same high measured
 *    twice. The threshold is therefore in units of that spread — not in ticks,
 *    not in percent — which is the same scale `selectValueCandle` and
 *    `selectAbsorption` already measure travel in.
 *
 * 3. THE DELTA MUST HAVE MOVED TOO. If cumulative delta is essentially flat
 *    between the two pivots, it did not fail to follow — it did nothing at all,
 *    and calling that "divergence" would read a finding off a rounding error.
 *
 * 4. IT RESTS ON AGGRESSOR SIDES THIS MODULE DOES NOT OWN. Cumulative delta IS
 *    a claim about who initiated. `provenance` travels out, and on live US
 *    equities it will usually say the sides were inferred by a tick rule.
 *
 * ── ORDER MATTERS HERE, AND THAT IS NEW ─────────────────────────────────────
 *
 * `selectValueCandle` is deliberately order-independent: value is a
 * distribution and shuffling the prints cannot move it. This module is the
 * opposite and must be, because a divergence is a statement about SEQUENCE. The
 * caller therefore owes it prints in tape order, and a caller that sorts or
 * regroups them first has changed the answer. That obligation is stated here
 * because it cannot be detected at runtime.
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────
 *
 * A divergence is not a reversal signal and is not a trade. It is one sentence
 * about two moments in one window: price got somewhere the delta did not
 * follow it to. Markets diverge for a long time. No field here should ever be
 * renamed to imply a prediction.
 *
 * PURE — composes one existing owner and stores nothing. No clock, no I/O.
 */

import {
  selectAggressorFlow,
  type AggressorTick,
  type AggressorProvenance,
} from "../selectAggressorFlow";
import { selectValueCandle } from "./selectValueCandle";

export const DELTA_DIVERGENCE_VERSION = "wm.delta-divergence.v1" as const;

/**
 *   BEARISH     price made a higher high; cumulative delta did not follow.
 *   BULLISH     price made a lower low; cumulative delta did not follow.
 *   CONFIRMED   price and delta made the same new extreme together. The move
 *               was paid for. This is a reading, not a failure to find one.
 *   NO_SWING    the window has no two pivots far enough apart to compare.
 *   UNMEASURED  no aggressive volume, or not enough tape to segment at all.
 */
export type DivergenceVerdict =
  | "BEARISH"
  | "BULLISH"
  | "CONFIRMED"
  | "NO_SWING"
  | "UNMEASURED";

export interface DivergencePoint {
  /** Index of the segment this pivot sits in, 0-based along the tape. */
  readonly segment: number;
  readonly price: number;
  /** Cumulative delta at the END of that segment. */
  readonly cvd: number;
}

export interface DeltaSegment {
  readonly index: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  /** Cumulative aggressive delta through the end of this segment. */
  readonly cvd: number;
  readonly prints: number;
}

export interface DeltaDivergenceVM {
  readonly version: typeof DELTA_DIVERGENCE_VERSION;
  readonly verdict: DivergenceVerdict;
  /** The earlier of the two compared pivots. Null when nothing was compared. */
  readonly priorPivot: DivergencePoint | null;
  /** The later of the two compared pivots. */
  readonly recentPivot: DivergencePoint | null;
  /** Signed price change between the two pivots. */
  readonly priceChange: number | null;
  /** Signed cumulative-delta change between the same two pivots. */
  readonly cvdChange: number | null;
  /** The compared swing measured in the window's own spread. */
  readonly swingInSpread: number | null;
  /** The drawable path — always emitted when the tape could be segmented. */
  readonly segments: readonly DeltaSegment[];
  readonly provenance: AggressorProvenance;
  readonly requiresDisclosure: boolean;
  /** One honest line. Never empty, in any state. */
  readonly detail: string;
}

/**
 * How many equal-count slices the tape is cut into before pivots are looked
 * for. Segments denoise: a pivot found on raw prints is a pivot found on
 * whichever print happened to land last.
 */
export const DIVERGENCE_SEGMENTS = 12;

/** Below this many trade prints there is no shape to segment. */
export const DIVERGENCE_MIN_PRINTS = 24;

/**
 * How far a new extreme must clear the previous one, in units of the window's
 * own volume-weighted spread, before it counts as a new extreme at all.
 */
export const SWING_MIN_SPREADS = 0.25;

/**
 * How much cumulative delta must have moved between the two pivots before its
 * direction is meaningful, as a share of the window's total aggressive volume.
 * Below this the delta did not fail to follow — it did nothing.
 */
export const CVD_MIN_SHARE = 0.02;

interface SidedPrint {
  price: number;
  size: number;
  signed: number;
}

const EMPTY: DeltaDivergenceVM = {
  version: DELTA_DIVERGENCE_VERSION,
  verdict: "UNMEASURED",
  priorPivot: null,
  recentPivot: null,
  priceChange: null,
  cvdChange: null,
  swingInSpread: null,
  segments: [],
  provenance: "UNDISCLOSED",
  requiresDisclosure: true,
  detail: "not enough aggressive tape to trace a delta path",
};

export function selectDeltaDivergence(
  ticks: readonly AggressorTick[] | null | undefined,
  segmentCount: number = DIVERGENCE_SEGMENTS,
): DeltaDivergenceVM {
  const flow = selectAggressorFlow(ticks);
  if (!flow.hasFlow) return EMPTY;

  // Only SIDED trade prints can build a delta path. Unsided prints are real
  // executions and they are counted in the flow owner's VWAP, but they cannot
  // move a cumulative delta in either direction, so including them here would
  // stretch the path's time axis with points that carry no delta evidence.
  const prints = sidedPrints(ticks);
  if (prints.length < DIVERGENCE_MIN_PRINTS) {
    return {
      ...EMPTY,
      provenance: flow.provenance,
      requiresDisclosure: flow.provenance !== "PROVIDER",
      detail: `only ${prints.length} sided prints — a divergence needs at least ${DIVERGENCE_MIN_PRINTS} to have a shape`,
    };
  }

  const segments = segment(prints, Math.max(3, segmentCount));

  // The scale. Same owner as everywhere else in this family — the window's own
  // volume-weighted spread, so a "higher high" means the same thing here as
  // "price travelled" does in selectAbsorption.
  const value = selectValueCandle(prints.map((p) => ({ price: p.price, size: p.size })));
  const spread = value.spread != null && value.spread > 0 ? value.spread : null;
  const totalVol = flow.askVol + flow.bidVol;

  const base = {
    version: DELTA_DIVERGENCE_VERSION,
    segments,
    provenance: flow.provenance,
    requiresDisclosure: flow.provenance !== "PROVIDER",
  } as const;

  if (spread == null) {
    // Every print at one price. There is a delta path but no swing to hang a
    // divergence on, and inventing a scale to force one would be the exact
    // abuse this module was written against.
    return {
      ...EMPTY,
      ...base,
      verdict: "NO_SWING",
      detail: "every print landed at one price — no swing to compare delta against",
    };
  }

  const minSwing = SWING_MIN_SPREADS * spread;
  const minCvd = CVD_MIN_SHARE * totalVol;

  const highs = findPivots(segments, "high");
  const lows = findPivots(segments, "low");

  // Prefer whichever comparable pair ends LATER in the tape. Both a high pair
  // and a low pair can qualify; the reader is owed the one that is still true.
  const bearish = comparePair(highs, segments, "high", minSwing, minCvd);
  const bullish = comparePair(lows, segments, "low", minSwing, minCvd);

  const chosen =
    bearish && bullish
      ? bearish.recent.segment >= bullish.recent.segment
        ? bearish
        : bullish
      : (bearish ?? bullish);

  if (!chosen) {
    return {
      ...EMPTY,
      ...base,
      verdict: "NO_SWING",
      detail: `no two pivots clear ${SWING_MIN_SPREADS}× this window's spread — nothing to compare`,
    };
  }

  const priceChange = round6(chosen.recent.price - chosen.prior.price);
  const cvdChange = round6(chosen.recent.cvd - chosen.prior.cvd);
  const swingInSpread = round6(priceChange / spread);

  // A new HIGH wants delta higher with it; a new LOW wants delta lower.
  // Divergence is delta going the OTHER way, or failing to move at all while
  // price did — both mean the new extreme was not paid for.
  const followed =
    chosen.kind === "high" ? cvdChange >= minCvd : cvdChange <= -minCvd;

  const verdict: DivergenceVerdict = followed
    ? "CONFIRMED"
    : chosen.kind === "high"
      ? "BEARISH"
      : "BULLISH";

  return {
    ...EMPTY,
    ...base,
    verdict,
    priorPivot: chosen.prior,
    recentPivot: chosen.recent,
    priceChange,
    cvdChange,
    swingInSpread,
    detail: lineFor(verdict, chosen.kind, swingInSpread),
  };
}

function lineFor(
  verdict: DivergenceVerdict,
  kind: "high" | "low",
  swing: number,
): string {
  const move = `${Math.abs(swing).toFixed(1)}× the window's own spread`;
  switch (verdict) {
    case "CONFIRMED":
      return kind === "high"
        ? `price made a higher high and delta came with it — the move was paid for (${move})`
        : `price made a lower low and delta came with it — the move was paid for (${move})`;
    case "BEARISH":
      return `price made a higher high by ${move}; cumulative delta did not follow — fewer aggressive buyers paid for the second push`;
    case "BULLISH":
      return `price made a lower low by ${move}; cumulative delta did not follow — fewer aggressive sellers paid for the second push`;
    default:
      return "no comparable swing in this window";
  }
}

/** Trade prints that carry an aggressor side, in tape order. */
function sidedPrints(ticks: readonly AggressorTick[] | null | undefined): SidedPrint[] {
  if (!Array.isArray(ticks)) return [];
  const out: SidedPrint[] = [];
  for (const t of ticks) {
    if (!t || t.trade !== true) continue;
    const side = t.side;
    if (side !== "buy" && side !== "sell") continue;
    const price = Number(t.price);
    const size = Number(t.size);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(size) || size <= 0) continue;
    out.push({ price, size, signed: side === "buy" ? size : -size });
  }
  return out;
}

/**
 * Equal-COUNT segments, not equal-time. This module has no clock and the ticks
 * carry no timestamp it is willing to trust, so slicing by print count is the
 * only division it can make honestly. The consequence is worth stating: a busy
 * minute and a quiet ten minutes can occupy the same segment width.
 */
function segment(prints: readonly SidedPrint[], n: number): DeltaSegment[] {
  const per = prints.length / n;
  const out: DeltaSegment[] = [];
  let cvd = 0;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * per);
    const end = i === n - 1 ? prints.length : Math.floor((i + 1) * per);
    if (end <= start) continue;
    let high = -Infinity;
    let low = Infinity;
    for (let j = start; j < end; j++) {
      const p = prints[j];
      if (p.price > high) high = p.price;
      if (p.price < low) low = p.price;
      cvd += p.signed;
    }
    out.push({
      index: out.length,
      high,
      low,
      close: prints[end - 1].price,
      cvd,
      prints: end - start,
    });
  }
  return out;
}

/**
 * A pivot high is a segment whose high is strictly above the one before it and
 * at least equal to the one after. Lows mirror it. The first and last segments
 * cannot be pivots because a pivot is defined by having neighbours on BOTH
 * sides — a rule this module keeps even though it means the most recent
 * segment can never be the pivot a reader is watching form.
 */
function findPivots(segments: readonly DeltaSegment[], kind: "high" | "low"): number[] {
  const out: number[] = [];
  for (let i = 1; i < segments.length - 1; i++) {
    const v = segments[i][kind];
    const prev = segments[i - 1][kind];
    const next = segments[i + 1][kind];
    if (kind === "high" ? v > prev && v >= next : v < prev && v <= next) out.push(i);
  }
  return out;
}

interface Pair {
  kind: "high" | "low";
  prior: DivergencePoint;
  recent: DivergencePoint;
}

/**
 * Walk the pivots from the most recent backwards and take the first pair whose
 * swing clears the noise floor. Taking the LAST TWO unconditionally would
 * compare two points that may be the same price twice; taking the BIGGEST pair
 * would let the module shop the window for its preferred answer.
 */
function comparePair(
  pivots: readonly number[],
  segments: readonly DeltaSegment[],
  kind: "high" | "low",
  minSwing: number,
  _minCvd: number,
): Pair | null {
  for (let a = pivots.length - 1; a >= 1; a--) {
    const recent = segments[pivots[a]];
    for (let b = a - 1; b >= 0; b--) {
      const prior = segments[pivots[b]];
      const diff = recent[kind] - prior[kind];
      const cleared = kind === "high" ? diff >= minSwing : diff <= -minSwing;
      if (cleared) {
        return {
          kind,
          prior: { segment: prior.index, price: prior[kind], cvd: prior.cvd },
          recent: { segment: recent.index, price: recent[kind], cvd: recent.cvd },
        };
      }
    }
  }
  return null;
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}
