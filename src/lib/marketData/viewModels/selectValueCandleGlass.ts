/**
 * THE VALUE CANDLE, FINALLY DRAWN ON A CANDLE.
 *
 * `selectValueCandle` answers the question an OHLC bar refuses to: not where
 * price went, but WHERE THE TRADING ACTUALLY HAPPENED. Its centre of gravity is
 * Σ(Price × Volume) / Σ(Volume) — a measurement with no parameters to tune and
 * no lookback to choose — and its value band is CoG ± one volume-weighted
 * standard deviation, a shape the distribution dictates rather than a
 * percentage the house picked.
 *
 * And every one of those numbers was a ROW IN A DRAWER. `centerOfGravity`,
 * `valueLow`, `valueHigh` and a full `bins` distribution with a price on every
 * bin — all of it prices, none of it ever placed on the price axis it belongs
 * to. The invention is called the WM Value CANDLE and there was no candle.
 *
 * WHAT THIS MODULE REFUSES TO LET THE CANVAS DO
 *
 * · PRESENT `concentration` AS TIGHTNESS. It is not, and the upstream docblock
 *   says so at length: a perfectly two-sided auction — two heavy shelves, a
 *   hollow middle — puts both shelves on the band edges and reports 100%,
 *   because "all the volume is inside ±1σ" is simply true of it. What makes
 *   that auction loose is how WIDE the band had to be, which is `bandCoverage`.
 *   So the headline number on the glass is BAND WIDTH AS A SHARE OF RANGE, and
 *   concentration is spoken, when spoken at all, as the share inside the band
 *   and never as a quality score.
 *
 * · ANNOUNCE A MIGRATION THAT WAS NOT FOUND. "Value is lagging price" is the
 *   most useful sentence the engine produces and the easiest to fake, because
 *   at any instant the last print differs from the CoG by SOMETHING. The engine
 *   already refuses: anything inside half a sigma is ALIGNED and is reported as
 *   no finding. This module carries that refusal onto the glass by emitting no
 *   migration text at all unless the verdict is LAGGED. An ALIGNED reading gets
 *   silence, not a reassurance — the §9 rule that absence of a warning is not a
 *   safety claim only holds if the calm state is genuinely quiet.
 *
 * · DRAW A DISTRIBUTION THAT WAS NOT MEASURED. `measured === false` is a state
 *   of our knowledge, not of the market. Nothing is drawn, and a caller that
 *   wants to say so has `reason` to say it with.
 *
 * THE HISTOGRAM IS SELF-SCALING, AND THAT IS THE ONLY CLAIM IT MAKES.
 *
 * Each bin's drawn width is its share divided by the LARGEST share in the same
 * window. So the widest rung is always the heaviest price in view and nothing
 * else — no absolute volume scale is implied, because there is no absolute
 * volume scale that survives a symbol change.
 *
 * PURE — no React, no canvas, no clock.
 */

import type { ValueCandleVM } from "./selectValueCandle";

export const VALUE_GLASS_VERSION = "wm.value-candle-glass.v1" as const;

export type ValueGlassReason = "UNMEASURED" | "DRAWN";

export interface ValueGlassRung {
  /** Bin bottom edge, in price. */
  readonly loPrice: number;
  /** Bin top edge, in price. */
  readonly hiPrice: number;
  /**
   * Drawn width, 0..1, as a fraction of the heaviest bin IN THIS WINDOW. The
   * only claim: this price traded more than that one.
   */
  readonly widthFrac: number;
  /** True when this rung lies inside the measured value band. */
  readonly inValue: boolean;
}

export interface ValueGlassVM {
  readonly version: typeof VALUE_GLASS_VERSION;
  readonly drawn: boolean;
  readonly reason: ValueGlassReason;
  /** The spine. Σ(Price × Volume) / Σ(Volume). */
  readonly cog: number | null;
  readonly valueLow: number | null;
  readonly valueHigh: number | null;
  readonly rungs: readonly ValueGlassRung[];
  /**
   * The headline. Carries BAND COVERAGE, the honest tightness number — never
   * concentration dressed up as one.
   */
  readonly label: string;
  /**
   * The finding, or null when there is none. Non-null ONLY on LAGGED; an
   * aligned auction is silent rather than reassured.
   */
  readonly migrationLabel: string | null;
}

function empty(): ValueGlassVM {
  return {
    version: VALUE_GLASS_VERSION,
    drawn: false,
    reason: "UNMEASURED",
    cog: null,
    valueLow: null,
    valueHigh: null,
    rungs: [],
    label: "",
    migrationLabel: null,
  };
}

/**
 * Compile a value-candle reading into the few facts a canvas needs.
 *
 * Handed null — a chart whose room has computed no reading — this returns
 * UNMEASURED, which is the same thing to the glass as a tape with no sizes in
 * it: nothing to place.
 */
export function selectValueCandleGlass(
  vm: ValueCandleVM | null | undefined,
): ValueGlassVM {
  if (!vm || !vm.measured) return empty();

  const cog = vm.centerOfGravity;
  const lo = vm.valueLow;
  const hi = vm.valueHigh;

  // A measured reading missing its own centre is a contradiction upstream, not
  // a market state. The band is not reconstructed from the bins to paper over
  // it — that would hide the bug behind a confident picture.
  if (
    typeof cog !== "number" || !Number.isFinite(cog) ||
    typeof lo !== "number" || !Number.isFinite(lo) ||
    typeof hi !== "number" || !Number.isFinite(hi)
  ) {
    return empty();
  }

  const usable = vm.bins.filter(
    (b) =>
      Number.isFinite(b.loPrice) &&
      Number.isFinite(b.hiPrice) &&
      Number.isFinite(b.share) &&
      b.share > 0,
  );
  // The heaviest bin in THIS window sets the scale. Guarded against a zero max
  // so a window of empty bins divides by nothing.
  const maxShare = usable.reduce((m, b) => (b.share > m ? b.share : m), 0);
  const rungs: ValueGlassRung[] =
    maxShare > 0
      ? usable.map((b) => ({
          loPrice: Math.min(b.loPrice, b.hiPrice),
          hiPrice: Math.max(b.loPrice, b.hiPrice),
          widthFrac: b.share / maxShare,
          inValue: b.inValue,
        }))
      : [];

  // BAND COVERAGE IS THE HEADLINE, not concentration. 0.2 means the value band
  // covers a fifth of the observed range — a real auction with a real value
  // area. 1.0 means it covers all of it and the candle has no value area worth
  // the name, which a hollow barbell cannot hide from.
  const parts = ["VALUE"];
  if (typeof vm.bandCoverage === "number" && Number.isFinite(vm.bandCoverage)) {
    parts.push(`BAND ${Math.round(vm.bandCoverage * 100)}% OF RANGE`);
  } else {
    // The engine measured a centre but not a width. Say which number is
    // missing rather than printing the other one and letting it pass for the
    // whole reading.
    parts.push("WIDTH UNMEASURED");
  }
  parts.push(`${vm.prints} PRINTS`);

  return {
    version: VALUE_GLASS_VERSION,
    drawn: true,
    reason: "DRAWN",
    cog,
    valueLow: Math.min(lo, hi),
    valueHigh: Math.max(lo, hi),
    rungs,
    label: parts.join(" · "),
    // The engine's own sentence, unedited, and only when it found something.
    migrationLabel: vm.migration === "LAGGED" ? vm.migrationDetail : null,
  };
}

export default selectValueCandleGlass;
