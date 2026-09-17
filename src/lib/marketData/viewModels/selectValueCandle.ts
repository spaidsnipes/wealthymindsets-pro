/**
 * selectValueCandle — the WM Value Candle, compiled from real prints.
 *
 * ── WHAT A CANDLE REFUSES TO SAY ─────────────────────────────────────────────
 *
 * A conventional candle answers four questions — open, high, low, close — and
 * every one of them is about an EXTREME or an EDGE. None of them is about where
 * the trading actually happened. A bar can run two dollars, print ninety-six
 * percent of its volume in the bottom eighth, and close at the high; the candle
 * that draws it looks identical to one that traded evenly the whole way up.
 *
 * The Founder's WM Value Candle asks the missing question: WHERE IS THE VALUE?
 * Its answer is one number, and the number has a formula that fits on a line —
 *
 *     Center of Gravity = Σ(Price × Volume) / Σ(Volume)
 *
 * a volume-weighted mean price. That is a measurement, not a model: it has no
 * parameters to tune, no lookback to choose, and no way to be "calibrated" into
 * saying something more flattering. It is the price the market paid, on average,
 * weighted by how much it paid there.
 *
 * ── THE THREE PLACES THIS COULD HAVE LIED, AND WHAT IT DOES INSTEAD ──────────
 *
 * 1. THE VALUE BAND. Every volume-profile surface draws a "value area", and
 *    almost all of them draw the band that CONTAINS a target percentage — 68%,
 *    70%, whatever the house convention is. Done that way, the percentage on
 *    screen is a CONSTANT: it is the thing you asked for, echoed back. The
 *    trader reads it as a finding.
 *
 *    Here the band is defined first and the percentage is measured second. The
 *    band is Center of Gravity ± one volume-weighted standard deviation of
 *    price — a shape the distribution itself dictates — and `concentration` is
 *    then the share of volume that actually fell inside it. So a tight,
 *    single-price auction reports a high number and a smeared, two-sided one
 *    reports a low number, and neither reports the number we picked.
 *
 * 2. MIGRATION. "Value is lagging price" is the most useful sentence this
 *    module can produce and the easiest one to fake, because at any instant
 *    `last` differs from the CoG by SOMETHING and a naive implementation will
 *    always find a direction to announce. The gap is therefore measured in
 *    units of the distribution's own spread (σ), not in ticks or percent, and
 *    anything inside half a sigma is ALIGNED — reported as no finding at all.
 *    A wide, uncertain auction has to move further before this module will
 *    claim value is trailing, which is exactly correct: in a wide auction it
 *    has less idea where value is.
 *
 * 3. NO VOLUME. A price stream with no sizes, or a window where nothing traded,
 *    is not a candle with a CoG of zero — it is a candle with no CoG. Every
 *    numeric field is `null` in that case and `measured` is false, so a surface
 *    physically cannot print "0.00000" where the honest answer is "nothing
 *    traded here yet". Zero and absent are different claims (canon §Silence).
 *
 * ── WHAT IT DOES NOT KNOW ────────────────────────────────────────────────────
 *
 * This reads PRINTS. It does not read the aggressor side, so the Value Candle
 * has no opinion about who was buying — that question belongs to
 * `selectAggressorFlow`, which carries the provenance disclosure that question
 * requires. A print with a size and a price is enough to say where value is,
 * and is not enough to say who put it there. Those two sentences are the whole
 * boundary of this module.
 *
 * PURE — no React, no I/O, no clock. Deterministic for a given tick array.
 */

export const VALUE_CANDLE_VERSION = "wm.value-candle.v1" as const;

/**
 * Where the last print stands relative to where the volume actually traded.
 *
 *   ALIGNED     the last print is inside half a sigma of the Center of
 *               Gravity — price and value agree, and there is no finding.
 *   LAGGED      price has separated from value by more than half a sigma.
 *               `migrationDetail` states which way and by how much.
 *   UNMEASURED  no volume was observed. Not a state of the market; a state of
 *               our knowledge of it.
 */
export type ValueMigration = "ALIGNED" | "LAGGED" | "UNMEASURED";

/** One horizontal slice of the traded-volume distribution, for rendering. */
export interface ValueBin {
  /** Bin centre price. */
  readonly price: number;
  /** Bin bottom edge (inclusive). */
  readonly loPrice: number;
  /** Bin top edge. */
  readonly hiPrice: number;
  /** Volume that printed inside this bin. */
  readonly volume: number;
  /** Share of total observed volume, 0..1. */
  readonly share: number;
  /** True when this bin lies inside the measured value band. */
  readonly inValue: boolean;
}

export interface ValueCandleVM {
  readonly version: typeof VALUE_CANDLE_VERSION;
  /** False when no print with a real price AND a real size was observed. */
  readonly measured: boolean;
  /** Σ(Price × Volume) / Σ(Volume), or null when nothing traded. */
  readonly centerOfGravity: number | null;
  /** Volume-weighted standard deviation of price, or null. */
  readonly spread: number | null;
  /** CoG − σ, the bottom of the measured value band. */
  readonly valueLow: number | null;
  /** CoG + σ, the top of the measured value band. */
  readonly valueHigh: number | null;
  /**
   * MEASURED share of volume inside the band, as a whole percent. This is an
   * observation of the distribution, never a target echoed back.
   *
   * READ IT WITH `bandCoverage`. On its own it is not a tightness score: a
   * perfectly two-sided auction — two heavy shelves and a hollow middle — puts
   * both shelves exactly on the band edges and reports 100%, because that
   * sentence ("all of the volume is inside ±1σ") is simply TRUE of it. What
   * makes such an auction loose is not where the volume is relative to the
   * band, it is how WIDE the band had to be, and that is the next field.
   */
  readonly concentration: number | null;
  /**
   * Band width as a share of the observed price range, 0..1. The honest
   * tightness number: 0.2 means the value band covers a fifth of the candle,
   * 1.0 means it covers all of it and the candle has no value area worth the
   * name. A hollow barbell cannot hide here — it always reports ~1.
   */
  readonly bandCoverage: number | null;
  /** Extremes of the observed prints. */
  readonly high: number | null;
  readonly low: number | null;
  /** The last observed print price — the candle's close, so far. */
  readonly last: number | null;
  /** Total observed volume, and how many prints carried it. */
  readonly volume: number;
  readonly prints: number;
  readonly migration: ValueMigration;
  /** One honest line. Never empty, in any state. */
  readonly migrationDetail: string;
  /** Traded-volume distribution for rendering. Empty when unmeasured. */
  readonly bins: readonly ValueBin[];
}

/** Anything with a price and a size. Structurally compatible with AggressorTick. */
export interface ValueCandleTick {
  readonly price?: number | null | undefined;
  readonly size?: number | null | undefined;
}

/** Default resolution of the rendered distribution. */
export const VALUE_CANDLE_BINS = 24;

/**
 * How far the last print must separate from the Center of Gravity, in units of
 * the distribution's own spread, before this module will claim a migration.
 * Stated as a named constant because it is the one judgement call in the file.
 */
export const MIGRATION_SIGMA_THRESHOLD = 0.5;

const UNMEASURED: ValueCandleVM = {
  version: VALUE_CANDLE_VERSION,
  measured: false,
  centerOfGravity: null,
  spread: null,
  valueLow: null,
  valueHigh: null,
  concentration: null,
  bandCoverage: null,
  high: null,
  low: null,
  last: null,
  volume: 0,
  prints: 0,
  migration: "UNMEASURED",
  migrationDetail: "no trade volume observed — value cannot be located",
  bins: [],
};

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Price decimals that survive both a $400 equity and a 1.08940 FX quote. */
function decimalsFor(price: number): number {
  if (price >= 100) return 2;
  if (price >= 1) return 4;
  return 6;
}

/**
 * σ IS A WIDTH, AND A WIDTH DOES NOT HAVE THE INSTRUMENT'S SCALE.
 *
 * `decimalsFor` picks decimals from how big the PRICE is, which is right for a
 * price and wrong for a distance between two of them. A $400 name trading in a
 * three-cent band has σ ≈ 0.004; rounded to a price's two decimals that is
 * 0.00 — and σ is the denominator four other modules quote their findings in.
 * Zero σ does not make them cautious, it makes them divide by nothing.
 *
 * FOUND BY A SCALE-INVARIANCE TEST in `selectStackedImbalance`: the same tape
 * shape measured at $100/1-cent and at $2,000/25-cent gave different answers,
 * which can only happen if some constant here is secretly denominated in
 * dollars. The reading was right on exactly one class of instrument.
 *
 * It is the third appearance of one bug: fixed-decimal rounding applied to a
 * quantity whose scale is not known in advance. Significant figures keep the
 * value's own scale, which is the only thing that is safe to assume about it.
 */
function roundSig(value: number, digits = 6): number {
  if (!Number.isFinite(value) || value === 0) return value;
  return Number(value.toPrecision(digits));
}

export function selectValueCandle(
  ticks: readonly ValueCandleTick[] | null | undefined,
  binCount: number = VALUE_CANDLE_BINS,
): ValueCandleVM {
  if (!Array.isArray(ticks) || ticks.length === 0) return UNMEASURED;

  const valid: Array<{ price: number; size: number }> = [];
  let volume = 0;
  let weighted = 0;
  let high = -Infinity;
  let low = Infinity;

  for (const t of ticks) {
    const price = Number(t?.price);
    const size = Number(t?.size);
    // A print with no size cannot weight anything, and a print with no price
    // cannot be placed. Neither is an error; both are simply not evidence of
    // where value is, so they are not counted on either side of the division.
    if (!Number.isFinite(price) || price <= 0) continue;
    if (!Number.isFinite(size) || size <= 0) continue;
    valid.push({ price, size });
    volume += size;
    weighted += price * size;
    if (price > high) high = price;
    if (price < low) low = price;
  }

  if (valid.length === 0 || !(volume > 0)) return UNMEASURED;

  const cogRaw = weighted / volume;
  const dp = decimalsFor(cogRaw);

  // Volume-weighted variance about the CoG. Population form — this is the
  // observed distribution, not a sample from a larger one we are estimating.
  let variance = 0;
  for (const v of valid) {
    const d = v.price - cogRaw;
    variance += v.size * d * d;
  }
  const sigmaRaw = Math.sqrt(variance / volume);
  /**
   * A HUNDRED PRINTS AT ONE PRICE HAVE NO SPREAD, and summing squares in
   * floating point does not always agree — it returns things like 5.7e-14.
   * The old fixed-decimal rounding erased that as an accident of rounding a
   * width to a price's decimals. Removing that bug removes the accident too,
   * so the erasure now has to be deliberate and at a scale that means
   * something: below about a billionth of the price itself, a "width" is
   * arithmetic residue, not a market fact.
   *
   * This matters more than a cosmetic zero. Four modules divide by σ. A σ of
   * 5.7e-14 passes every `spread > 0` guard they have and then reports a
   * one-cent move as roughly two hundred billion standard deviations.
   */
  const sigma = sigmaRaw > Math.abs(cogRaw) * 1e-9 ? sigmaRaw : 0;

  const bandLow = cogRaw - sigma;
  const bandHigh = cogRaw + sigma;

  let inBand = 0;
  for (const v of valid) {
    if (v.price >= bandLow && v.price <= bandHigh) inBand += v.size;
  }
  const concentration = Math.round((inBand / volume) * 100);
  // A single-price auction has no range to cover. Its band is a point, and the
  // honest coverage of a point inside a point is total.
  const bandCoverage = high > low ? Math.min(1, (2 * sigma) / (high - low)) : 1;

  const last = valid[valid.length - 1].price;

  let migration: ValueMigration = "ALIGNED";
  let migrationDetail = "price is trading inside value";
  if (sigma > 0) {
    const gap = last - cogRaw;
    if (Math.abs(gap) > MIGRATION_SIGMA_THRESHOLD * sigma) {
      migration = "LAGGED";
      const direction = gap > 0 ? "above" : "below";
      migrationDetail = `price is ${round(Math.abs(gap), dp)} ${direction} value · value has not followed`;
    } else {
      // A WIDTH, not a price — see `roundSig`. At a price's decimals this read
      // "price is within 0 of value" on any tight tape, which is both alarming
      // and untrue.
      migrationDetail = `price is within ${roundSig(sigma * MIGRATION_SIGMA_THRESHOLD, 3)} of value`;
    }
  } else {
    // Every print at one price. There is no spread to measure migration in, so
    // there is no migration to report — not an ALIGNED "finding", a single
    // point.
    migrationDetail = "every print landed at one price — no spread to measure";
  }

  const bins: ValueBin[] = [];
  const span = high - low;
  const n = Math.max(1, Math.floor(binCount));
  if (span > 0) {
    const width = span / n;
    const acc = new Array<number>(n).fill(0);
    for (const v of valid) {
      let idx = Math.floor((v.price - low) / width);
      if (idx >= n) idx = n - 1;
      if (idx < 0) idx = 0;
      acc[idx] += v.size;
    }
    for (let i = 0; i < n; i++) {
      if (acc[i] <= 0) continue;
      const loPrice = low + i * width;
      const hiPrice = loPrice + width;
      const centre = loPrice + width / 2;
      bins.push({
        price: round(centre, dp),
        loPrice: round(loPrice, dp),
        hiPrice: round(hiPrice, dp),
        volume: acc[i],
        share: acc[i] / volume,
        inValue: centre >= bandLow && centre <= bandHigh,
      });
    }
  } else {
    bins.push({
      price: round(low, dp),
      loPrice: round(low, dp),
      hiPrice: round(high, dp),
      volume,
      share: 1,
      inValue: true,
    });
  }

  return {
    version: VALUE_CANDLE_VERSION,
    measured: true,
    centerOfGravity: round(cogRaw, dp),
    spread: roundSig(sigma),
    valueLow: round(bandLow, dp),
    valueHigh: round(bandHigh, dp),
    concentration,
    bandCoverage: round(bandCoverage, 3),
    high: round(high, dp),
    low: round(low, dp),
    last: round(last, dp),
    volume,
    prints: valid.length,
    migration,
    migrationDetail,
    bins,
  };
}
