/**
 * F05 CLARITY — THE CANDLE'S OWN ANATOMY, READ ON PRICES.
 *
 * Canon: `WM_NewMockup_72_F05A_Clarity_Default_Language` ("Clarity is the
 * default language of the room") and `WM_NewMockup_73_F05B_Candle_Anatomy_
 * Inspect` ("Candle anatomy Inspect, camera alive"). The Manifestation Map
 * (2026-09-22) fixes what the invention IS:
 *
 *   F05 — CLARITY. VISIBLE: candle body / wick / gap / breath anatomy on owned
 *   CanonicalBar. Classic red/green remains default direction language. Gold
 *   is hardware / optional preset, not forced bullish candles.
 *   NOT: Clarity dashboard explaining normal candles.
 *
 * So Clarity is not a candle colour and not a page. It is what a selected bar
 * says about ITSELF — the F05A callout ("BODY EFFICIENCY 78% · WICK INTENT
 * Upper Rejection · TRUTH GAP Filled") and the F05B Inspect column (range,
 * open/close, balance about the centerline) — hung on the real bar.
 *
 * ── EVERY WORD IS DECIDED ON PRICES ─────────────────────────────────────────
 *
 * Same law as `selectNearCandleAnatomy`: a pixel test calls two prices equal
 * whenever the scale squeezes them together. Every reading below is arithmetic
 * on the bar's four prices, the bar before it, and the bars before that.
 *
 * ── WHAT IS REFUSED FROM THE PLATE, AND WHY ─────────────────────────────────
 *
 * F05B prints "PRESSURE SPLIT — BEAR 46% / BULL 54%" and "NET PRESSURE +0.08
 * (BULL SLIGHT)". From OHLC that is the green-candle-equals-buyers fiction
 * H-701 kills: where a bar closed inside its range is GEOMETRY, not a count of
 * who crossed the spread. So this owner prints the geometry under its own
 * name — CLOSE LOCATION and BALANCE about the centerline (the plate's
 * "D ≈ 0.00 · within 0.03 of centerline", kept exactly) — and never the words
 * bull, bear, buyer, seller or pressure. Signed aggression belongs to the
 * ticket's DELTA row, which reads the tape or refuses.
 *
 * The plate's numbers (78%, 0.37, 0.128) are illustrative and have no owner.
 *
 * PURE. DETERMINISTIC.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export const CLARITY_ANATOMY_VERSION = 1;

/** The chart's own bar, narrowed to its four prices. Never a private bar. */
export type ClarityBar = Pick<LegacyOhlcvTuple, "open" | "high" | "low" | "close">;

export type WickIntent = "UPPER_REJECTION" | "LOWER_REJECTION" | "TWO_SIDED_REJECTION" | "NO_REJECTION";

export type ClarityGap =
  | "NO_GAP"
  | "GAP_UP_FILLED"
  | "GAP_UP_OPEN"
  | "GAP_DOWN_FILLED"
  | "GAP_DOWN_OPEN"
  /** The first bar held — nothing before it to gap from. */
  | "NO_PRIOR_BAR";

export type ClarityBreath = "EXPANDING" | "CONTRACTING" | "ORDINARY" | "UNMEASURED";

/** A wick that is at least this share of the bar's range is a rejection… */
export const REJECTION_SHARE = 0.4;
/** …when it is also at least this many times the opposite wick. */
export const REJECTION_DOMINANCE = 2;
/** Both wicks at least this share of the range: rejected on both sides. */
export const TWO_SIDED_SHARE = 0.3;
/** F05B: "BALANCE STATE NEAR EQUILIBRIUM · D ≈ 0.00 (WITHIN 0.03 OF CENTERLINE)". */
export const BALANCE_BAND = 0.03;
/** Breath compares the range to the median range of up to this many prior bars… */
export const BREATH_SAMPLE = 20;
/** …and says nothing on fewer than this many. */
export const BREATH_MIN_BARS = 10;
/** At or above this multiple of the median range the bar breathes out. */
export const BREATH_WIDE = 1.5;
/** At or below this multiple it breathes in. */
export const BREATH_NARROW = 0.67;

export interface ClarityLine {
  readonly key: "BODY" | "WICK" | "GAP" | "BALANCE" | "BREATH" | "RANGE";
  readonly label: string;
  readonly value: string;
}

export interface ClarityAnatomyVM {
  readonly version: typeof CLARITY_ANATOMY_VERSION;
  readonly state: "READ" | "UNREAD";
  /** Why nothing was read. Null when READ. */
  readonly absence: string | null;
  readonly range: number | null;
  /** |close − open| ÷ (high − low), whole percent. Null on a zero-range bar. */
  readonly bodyEfficiencyPct: number | null;
  readonly wickIntent: WickIntent | null;
  readonly gap: ClarityGap;
  /** (close − low) ÷ range, whole percent. */
  readonly closeLocationPct: number | null;
  /** Close location − ½: −0.5 at the low, +0.5 at the high. */
  readonly balance: number | null;
  readonly breath: ClarityBreath;
  /** The lines a surface prints, in the plate's order. */
  readonly lines: readonly ClarityLine[];
}

export interface ClarityAnatomyInput {
  readonly bar: ClarityBar | null | undefined;
  /** The bars BEFORE the subject, oldest first. The subject is never among them. */
  readonly priorBars: readonly ClarityBar[];
  /** The market's decimals (`pricePrecisionFromBars`), for printed prices and the gap tick. */
  readonly dp: number;
}

const finite = (b: ClarityBar | null | undefined): b is ClarityBar =>
  !!b && [b.open, b.high, b.low, b.close].every(Number.isFinite) && b.high >= b.low;

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const pct = (x: number) => Math.round(x * 100);

const unread = (absence: string): ClarityAnatomyVM => ({
  version: CLARITY_ANATOMY_VERSION,
  state: "UNREAD",
  absence,
  range: null,
  bodyEfficiencyPct: null,
  wickIntent: null,
  gap: "NO_PRIOR_BAR",
  closeLocationPct: null,
  balance: null,
  breath: "UNMEASURED",
  lines: [],
});

export function wickIntentOf(bar: ClarityBar): WickIntent {
  const range = bar.high - bar.low;
  if (!(range > 0)) return "NO_REJECTION";
  const upper = (bar.high - Math.max(bar.open, bar.close)) / range;
  const lower = (Math.min(bar.open, bar.close) - bar.low) / range;
  if (upper >= TWO_SIDED_SHARE && lower >= TWO_SIDED_SHARE) return "TWO_SIDED_REJECTION";
  if (upper >= REJECTION_SHARE && upper >= REJECTION_DOMINANCE * lower) return "UPPER_REJECTION";
  if (lower >= REJECTION_SHARE && lower >= REJECTION_DOMINANCE * upper) return "LOWER_REJECTION";
  return "NO_REJECTION";
}

/**
 * The gap from the prior bar's close to this bar's open, and whether this
 * bar's own range travelled back to that close. Within half a tick of the
 * prior close is no gap: the market quotes in ticks, and a float wobble under
 * one is not a price.
 */
export function gapOf(bar: ClarityBar, prior: ClarityBar | undefined, dp: number): ClarityGap {
  if (!prior || !Number.isFinite(prior.close)) return "NO_PRIOR_BAR";
  const tick = 10 ** -Math.max(0, Math.round(dp));
  const gap = bar.open - prior.close;
  if (Math.abs(gap) < tick / 2) return "NO_GAP";
  if (gap > 0) return bar.low <= prior.close ? "GAP_UP_FILLED" : "GAP_UP_OPEN";
  return bar.high >= prior.close ? "GAP_DOWN_FILLED" : "GAP_DOWN_OPEN";
}

export function selectClarityAnatomy(input: ClarityAnatomyInput): ClarityAnatomyVM {
  const { bar, priorBars } = input;
  const dp = Math.max(0, Math.min(8, Math.round(input.dp)));
  if (!bar) return unread("No bar is selected.");
  if (!finite(bar)) return unread("The selected bar has a price that cannot be read, so its anatomy is not stated.");

  const fmt = (v: number) => v.toFixed(dp);
  const range = bar.high - bar.low;
  const body = Math.abs(bar.close - bar.open);
  const lines: ClarityLine[] = [];

  // RANGE — F05B "ANATOMY OF ACTUAL TRUTH RANGE · RANGE WIDTH".
  lines.push({ key: "RANGE", label: "Range", value: `${fmt(bar.low)} – ${fmt(bar.high)} · ${fmt(range)} wide` });

  // BODY — F05A "BODY EFFICIENCY 78%": how much of the range the body kept.
  const bodyEfficiencyPct = range > 0 ? pct(body / range) : null;
  lines.push({
    key: "BODY",
    label: "Body efficiency",
    value: bodyEfficiencyPct === null
      ? "no range — open, high, low and close are one price"
      : `${bodyEfficiencyPct}% · body ${fmt(body)} of ${fmt(range)}`,
  });

  // WICK — F05A "WICK INTENT · Upper Rejection".
  const wickIntent = wickIntentOf(bar);
  const upperShare = range > 0 ? pct((bar.high - Math.max(bar.open, bar.close)) / range) : 0;
  const lowerShare = range > 0 ? pct((Math.min(bar.open, bar.close) - bar.low) / range) : 0;
  const wickWords: Record<WickIntent, string> = {
    UPPER_REJECTION: "Upper rejection",
    LOWER_REJECTION: "Lower rejection",
    TWO_SIDED_REJECTION: "Rejected both ends",
    NO_REJECTION: "No rejection",
  };
  lines.push({
    key: "WICK",
    label: "Wick intent",
    value: `${wickWords[wickIntent]} · upper ${upperShare}% · lower ${lowerShare}% of range`,
  });

  // GAP — F05A "TRUTH GAP · Filled".
  const prior = priorBars.length > 0 ? priorBars[priorBars.length - 1] : undefined;
  const gap = gapOf(bar, prior, dp);
  const gapSize = prior ? Math.abs(bar.open - prior.close) : 0;
  const gapWords: Record<ClarityGap, string> = {
    NO_GAP: "No gap — opened at the prior close",
    GAP_UP_FILLED: `Gap up ${fmt(gapSize)} · filled back to ${prior ? fmt(prior.close) : ""}`,
    GAP_UP_OPEN: `Gap up ${fmt(gapSize)} · open above ${prior ? fmt(prior.close) : ""}`,
    GAP_DOWN_FILLED: `Gap down ${fmt(gapSize)} · filled back to ${prior ? fmt(prior.close) : ""}`,
    GAP_DOWN_OPEN: `Gap down ${fmt(gapSize)} · open below ${prior ? fmt(prior.close) : ""}`,
    NO_PRIOR_BAR: "First bar held — no prior close to gap from",
  };
  lines.push({ key: "GAP", label: "Truth gap", value: gapWords[gap] });

  // BALANCE — F05B "BATTLE BALANCE · D ≈ 0.00 (WITHIN 0.03 OF CENTERLINE)",
  // stated as geometry: where the close sits in the range. Never "pressure".
  const closeLocation = range > 0 ? (bar.close - bar.low) / range : null;
  const balance = closeLocation === null ? null : closeLocation - 0.5;
  lines.push({
    key: "BALANCE",
    label: "Close location",
    value: balance === null
      ? "no range to locate the close in"
      : Math.abs(balance) <= BALANCE_BAND
        ? `${pct(closeLocation!)}% of range · D ≈ 0.00 · on the centerline`
        : `${pct(closeLocation!)}% of range · D ${balance > 0 ? "+" : "−"}${Math.abs(balance).toFixed(2)} · ${balance > 0 ? "upper" : "lower"} half`,
  });

  // BREATH — the Map's fourth word: this range against the ranges before it.
  const ranges = priorBars
    .slice(-BREATH_SAMPLE)
    .filter(finite)
    .map(b => b.high - b.low)
    .filter(r => r > 0);
  let breath: ClarityBreath = "UNMEASURED";
  let breathValue = `unmeasured — ${ranges.length} of ${BREATH_MIN_BARS} prior bars with a range`;
  if (ranges.length >= BREATH_MIN_BARS) {
    const typical = median(ranges);
    const ratio = range / typical;
    breath = ratio >= BREATH_WIDE ? "EXPANDING" : ratio <= BREATH_NARROW ? "CONTRACTING" : "ORDINARY";
    const word = breath === "EXPANDING" ? "Breathing out" : breath === "CONTRACTING" ? "Breathing in" : "Ordinary breath";
    breathValue = `${word} · ${ratio.toFixed(1)}× the median range of the ${ranges.length} bars before`;
  }
  lines.push({ key: "BREATH", label: "Breath", value: breathValue });

  return {
    version: CLARITY_ANATOMY_VERSION,
    state: "READ",
    absence: null,
    range,
    bodyEfficiencyPct,
    wickIntent,
    gap,
    closeLocationPct: closeLocation === null ? null : pct(closeLocation),
    balance,
    breath,
    lines,
  };
}
