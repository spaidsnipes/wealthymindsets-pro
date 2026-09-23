/**
 * THE EFFORT READING, PUT BACK ON THE CANDLE IT IS ABOUT.
 *
 * Child: EFFORT→RESPONSE BAR MARK.  Parent family: F06 Absorption / Effort vs
 * Response.  Class: CHART LANGUAGE.  House surface: /charts main canvas.
 * Binding plate: H-701.
 *
 * ── WHY THIS MODULE EXISTS AT ALL ────────────────────────────────────────────
 *
 * `selectEffortVsResult` already decides, carefully, whether a bar spent much
 * and achieved little. That verdict is then rendered into a 236px panel pinned
 * to the top-left corner of the chart — a card that describes a candle while
 * pointing at nothing. The house law is blunt about this shape:
 *
 *     A paragraph describing absorption is not absorption.
 *     MENU BUILT + NO MARKET PAINT = OPEN.
 *
 * So this module answers one question and only one: GIVEN that verdict and the
 * subject bar, is there a mark to draw, and at exactly WHAT TIME and WHAT PRICE
 * does it hang? It renders nothing, measures nothing, and re-derives no grade.
 *
 * ── THE PRICE IT IS ALLOWED TO SPEND ─────────────────────────────────────────
 *
 * This is the whole safety argument, and it is the same one the liquidity
 * weather layer had to make: a RATIO HAS NO PRICE. `effortRatio` is 2.4 and
 * `resultRatio` is 0.3 and both of those would map onto a price axis without
 * the slightest complaint, and every such mapping is a level the house made up
 * and then drew as though the market had put it there.
 *
 * The only prices this mark may occupy are prices the SUBJECT BAR ITSELF
 * reached. Nothing is interpolated, averaged, projected or scaled. If the bar
 * did not trade there, the mark does not go there.
 *
 * ── AND WHY IT IS NOT ON EVERY BAR ───────────────────────────────────────────
 *
 * The reading has five shapes, and three of them are some flavour of "nothing
 * stood out." A mark on all five is wallpaper: a trader learns in a week that
 * the glyph means "a bar happened," which is the point at which the two shapes
 * that DO mean something have been destroyed by the three that do not.
 *
 * So only `HIGH_EFFORT_WEAK_RESULT` and `LOW_EFFORT_STRONG_RESULT` earn paint —
 * the two corners the reading was built to catch — and UNREAD earns nothing at
 * all. That last one is H1: a bar nobody could read must not receive a glyph
 * saying "read, unremarkable," because absence rendered as a value is the
 * cardinal defect of this product.
 *
 * ── THE WORDS, AND WHY THEY ARE NOT THE COMPILER'S WORDS ──────────────────────
 *
 * The panel says "Effort: High / Result: Weak." On the glass, beside a candle,
 * at 9px, that pair reads as a grade — and a grade invites the mechanism the
 * compiler explicitly refuses to assert (§ `limitNote`: absorption, an empty
 * auction and a halt all look identical in these two numbers).
 *
 * The mark therefore says what was OBSERVED, in plain words:
 *
 *     SPENT · DIDN'T MOVE      (high effort, weak result)
 *     MOVED · DIDN'T SPEND     (low effort, strong result)
 *
 * Neither is a diagnosis. Neither is a direction. Neither is good or bad, which
 * is also why §9 forbids either of them a hue: the first is where a reversal
 * starts and also where a trend rests, and the house grades neither.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type {
  EffortResultShape,
  EffortVsResultVM,
} from "@/lib/marketData/viewModels/selectEffortVsResult";
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";

/* ── WHAT THE GLASS NEEDS FROM THE BAR ─────────────────────────────────────── */

/**
 * Everything optional, and everything possibly null — because the cursor is
 * often nowhere and a caller with half a bar must be able to say so rather
 * than fabricate the other half.
 */
type Loose<T> = { readonly [K in keyof T]?: T[K] | null };

/**
 * The subject bar's own coordinates — PROJECTED FROM THE ARTERY, not declared
 * here.
 *
 * M8 is a ratchet on private bar shapes, and it is right to be: two modules
 * that each decide what a bar is can hold a different 09:31 for the same
 * symbol and neither is wrong by its own lights. Writing `open/high/low/close`
 * out longhand in this file would have been a fifth such past, invented for a
 * glyph. `Pick` keeps `CanonicalBar` the sole author of what those four words
 * mean, and the day the artery renames one this stops compiling — which is the
 * entire point of routing through it.
 *
 * `time` is not picked, and that is deliberate: `CanonicalBar` carries `asOf`,
 * `receivedAt` and `truthEpoch`, three clocks that mean three different things
 * (see its header on authority order vs arrival order). This field is none of
 * them. It is the chart's own bar-open key — the value `timeToCoordinate` is
 * addressed with — and calling it `time` here keeps it from being mistaken for
 * a claim about when anything was true.
 */
export type EffortMarkBar =
  Loose<Pick<CanonicalBar, "open" | "high" | "low" | "close">> & {
    readonly time?: number | null;
  };

/** Which side of the candle the mark hangs off. Never an arrow, never a hue. */
export type EffortMarkSide = "ABOVE" | "BELOW";

/** The two shapes that earn paint. Exported so a caller cannot guess wrong. */
export const MARKED_SHAPES: readonly EffortResultShape[] = Object.freeze([
  "HIGH_EFFORT_WEAK_RESULT",
  "LOW_EFFORT_STRONG_RESULT",
]);

export interface EffortMark {
  /** The subject bar's open time. The anchor on the horizontal axis. */
  readonly time: number;
  /** A price THE BAR ITSELF REACHED. Never derived from a ratio. */
  readonly price: number;
  readonly side: EffortMarkSide;
  readonly shape: EffortResultShape;
  /** Plain observation, not a grade. Drawn beside the tick. */
  readonly label: string;
}

export type EffortMarkVerdict =
  | { readonly drawn: true; readonly mark: EffortMark; readonly reason: string }
  | { readonly drawn: false; readonly mark: null; readonly reason: string };

const LABEL: Partial<Record<EffortResultShape, string>> = {
  HIGH_EFFORT_WEAK_RESULT: "SPENT · DIDN'T MOVE",
  LOW_EFFORT_STRONG_RESULT: "MOVED · DIDN'T SPEND",
};

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const refuse = (reason: string): EffortMarkVerdict =>
  ({ drawn: false, mark: null, reason });

/**
 * Where does the mark hang?
 *
 * On the far end of the travel the bar ACTUALLY MADE — the high of an up bar,
 * the low of a down bar — and then outside it, so the candle it describes is
 * never occluded by the description.
 *
 * This is a geometry choice and it is deliberately not a reading. It would be
 * easy, and wrong, to hang a "spent and didn't move" mark on the side the bar
 * "failed to break": that sentence contains an intention nobody observed. The
 * rule here contains none — it says only "this is the end of the move it made."
 *
 * A bar that closed exactly where it opened has no direction to take the far
 * end from. It gets ABOVE, as a stated tie-break rather than a finding; the
 * alternative — refusing a doji — would discard the single most characteristic
 * bar of the high-effort-weak-result corner this mark exists to catch.
 */
function sideFor(open: number, close: number): EffortMarkSide {
  return close < open ? "BELOW" : "ABOVE";
}

/**
 * Turn a verdict plus a bar into a thing with a place on the chart, or refuse
 * and say why.
 *
 * Every refusal carries a sentence, because the layer publishes its reason into
 * the canvas dataset in EVERY state. A layer that goes quiet without explaining
 * itself is indistinguishable from a layer that broke.
 */
export function selectEffortMark(
  vm: EffortVsResultVM | null | undefined,
  bar: EffortMarkBar | null | undefined,
): EffortMarkVerdict {
  if (!vm) return refuse("NO_READING");
  if (!bar) return refuse("NO_BAR");

  // H1 — a bar nobody could read gets no glyph. A mark meaning "read, and
  // unremarkable" placed on an UNREAD bar is absence rendered as a value.
  if (vm.state !== "READ") return refuse("UNREAD");

  if (!MARKED_SHAPES.includes(vm.shape)) {
    // Not a failure. The reading succeeded and found nothing notable, which is
    // a real finding — it is simply not a finding that belongs on the candles.
    return refuse(`ORDINARY:${vm.shape}`);
  }

  const label = LABEL[vm.shape];
  if (!label) return refuse(`NO_LABEL:${vm.shape}`);

  const { time, open, close, high, low } = bar;
  if (!finite(time)) return refuse("NO_ANCHOR_TIME");
  if (!finite(open) || !finite(close)) return refuse("NO_DISPLACEMENT");

  const side = sideFor(open, close);
  const price = side === "ABOVE" ? high : low;

  // THE REFUSAL THAT MATTERS. Without a real extreme there is no lawful price
  // for this mark, and the tempting repair — fall back to the close, or to the
  // midpoint — would put a house-invented level on the axis. There is no
  // fallback here on purpose.
  if (!finite(price)) return refuse("NO_BAR_EXTREME");

  return {
    drawn: true,
    reason: vm.shape,
    mark: { time, price, side, shape: vm.shape, label },
  };
}

export default selectEffortMark;
