/**
 * VOLATILITY AT FORMATION — the bar-computable context of a gap (Garden 19 §5,
 * §12; coordinator ruling 2026-10-09).
 *
 * TWO NAMED SCOPES, NEVER ONE WORD:
 *
 *   REGIME (tape scope)      selectRegime — read from the per-trade tape. It
 *                            cannot be recomputed for a past bar once the tape
 *                            is gone, so it is never stamped on a gap; a
 *                            bar-only study says UNTAGGED and why.
 *   VOLATILITY (bars scope)  THIS FILE — Market Breathing's own reading
 *                            (`readMarketBreathing`: ATR against its median
 *                            over the last 120 closed bars) taken over the
 *                            closed bars up to and including the gap's middle
 *                            bar b2. Reproducible from the same bars forever.
 *
 * AS-OF LAW: only `bars[0..b2Index]` are read. b2 had closed before the gap
 * existed (the gap is created at b3's close), so nothing here is learned
 * later, and bars after b2 cannot change the answer.
 *
 * SILENCE, each with its reason — never a guessed word:
 *   NO_CLOCK       bars with no time clock (tick bars): a formation time is
 *                  never guessed, so its context is not read either
 *   BAR_NOT_FOUND  b2 is not in the bars given
 *   TOO_FEW_BARS   fewer than 40 usable closed bars up to b2 (the owner's MIN_BARS)
 *
 * PURE. No new classifier: the state words and thresholds are the owner's.
 */
import { MIN_BARS, readMarketBreathing, type BreathBar, type BreathState } from "@/lib/chart/marketBreathing";

export type FvgVolatilitySilence = "NO_CLOCK" | "BAR_NOT_FOUND" | "TOO_FEW_BARS";

export interface FvgFormationVolatilityRead {
  readonly kind: "READ";
  /** The owner's word: COMPRESSED · NORMAL · EXPANDED. */
  readonly state: BreathState;
  /** ATR at b2 as a multiple of its median over the window (2 dp, the owner's rounding). */
  readonly atrRatio: number;
  /** Percentile (0–100) of that ATR within the window. */
  readonly atrPercentile: number;
  /** Closed bars up to and including b2 that were read. */
  readonly barsRead: number;
  readonly sentence: string;
}

export interface FvgFormationVolatilitySilent {
  readonly kind: "SILENCE";
  readonly reason: FvgVolatilitySilence;
  readonly barsRead: number;
  readonly sentence: string;
}

export type FvgFormationVolatility = FvgFormationVolatilityRead | FvgFormationVolatilitySilent;

/** A study / split facet value: the owner's state word, or NOT_READ. */
export type FvgVolatilityFacet = BreathState | "NOT_READ";
export const FVG_VOLATILITY_FACET_VALUES: readonly FvgVolatilityFacet[] = ["COMPRESSED", "NORMAL", "EXPANDED", "NOT_READ"];

export const FVG_VOLATILITY_SCOPE_NOTE =
  "Volatility at formation is read from closed bars (range against its own normal). It is not the regime, which is read from the tape." as const;

const WORD: Readonly<Record<BreathState, string>> = { COMPRESSED: "compressed", NORMAL: "normal", EXPANDED: "expanded" };

const silent = (reason: FvgVolatilitySilence, barsRead: number): FvgFormationVolatilitySilent => ({
  kind: "SILENCE", reason, barsRead,
  sentence:
    reason === "NO_CLOCK" ? "Volatility at formation: not read — these bars have no time clock."
    : reason === "BAR_NOT_FOUND" ? "Volatility at formation: not read — the gap's middle bar is not among the bars read."
    : `Volatility at formation: not read — ${barsRead} closed bars before the gap, ${MIN_BARS} needed.`,
});

/**
 * The volatility state as of the gap's formation.
 *
 * @param input.bars     oldest → newest, CLOSED bars (the caller drops a forming bar)
 * @param input.b2Index  index of the gap's middle bar in `bars`
 * @param input.clocked  false for bars with no time clock (tick bars). Default true.
 */
export function fvgVolatilityAtFormation(input: {
  readonly bars: readonly BreathBar[];
  readonly b2Index: number;
  readonly clocked?: boolean;
}): FvgFormationVolatility {
  const { bars, b2Index } = input;
  if (input.clocked === false) return silent("NO_CLOCK", 0);
  if (!Number.isInteger(b2Index) || b2Index < 0 || b2Index >= bars.length) return silent("BAR_NOT_FOUND", 0);
  const known = bars.slice(0, b2Index + 1);
  const r = readMarketBreathing(known);
  if (!r) return silent("TOO_FEW_BARS", known.length);
  return {
    kind: "READ", state: r.state, atrRatio: r.atrRatio, atrPercentile: r.atrPercentile, barsRead: known.length,
    sentence: `Volatility at formation: ${WORD[r.state]} — range ${r.atrRatio.toFixed(2)}× its normal (from ${known.length} closed bars).`,
  };
}

/**
 * The same reading, finding b2 by its open time — the `<b2 open ms>` every
 * FVG OBJECT_ID carries. `timeOf` returns a bar's open in epoch ms.
 */
export function fvgVolatilityAtFormationByTime<B extends BreathBar>(input: {
  readonly bars: readonly B[];
  readonly b2OpenMs: number;
  readonly timeOf: (bar: B) => number;
  readonly clocked?: boolean;
}): FvgFormationVolatility {
  if (input.clocked === false) return silent("NO_CLOCK", 0);
  const i = input.bars.findIndex(b => input.timeOf(b) === input.b2OpenMs);
  return fvgVolatilityAtFormation({ bars: input.bars, b2Index: i, clocked: input.clocked });
}

/** The facet value for a study split or a journal context. */
export function fvgVolatilityFacet(v: FvgFormationVolatility): FvgVolatilityFacet {
  return v.kind === "READ" ? v.state : "NOT_READ";
}
