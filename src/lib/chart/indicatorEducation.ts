/**
 * INDICATORS-MENU ⓘ RECORDS — Garden 19 §9, Sheriff P1-C (2026-10-08).
 *
 * The Indicators picker (ChartToolbar's catalogue, 142 rows) used a
 * five-section "?" panel built from category boilerplate: 118 of 142 said the
 * tool "supports trade decisions", 35 promised "an actionable signal", RSI told
 * the trader to "buy dips and sell rallies", VWAP "favors buyers" and "acts as
 * a magnet", and two price-only tools were filed under Order Flow.
 *
 * Every row now opens the SAME ⓘ preview as the Profiles / Lenses / Tool
 * Finder (`InventionPreview`), from the SAME record shape
 * (`InventionEducation`), looked up by `educationFor("IND:<name>")`.
 *
 * HOW THESE WERE WRITTEN: from what the chart actually computes — the
 * indicator block in the chart and the formulas in `indicators.ts` — with the
 * default windows those functions use. Where the drawing differs from the
 * catalogue's name (Stochastic Pop draws the SMI; Color RSI draws a smoothed
 * RSI with no colour fill), the record
 * says what is drawn, not what the name promises. No advice, no prediction:
 * each record says what the line measures and how to read its marks.
 *
 * A test pins: every catalogue row has a record; every field is present; none
 * of the banned advice / prediction phrases appears.
 */
import type { EvidenceNeed, InventionEducation } from "@/lib/chart/inventionEducation";

export interface IndicatorEducation extends InventionEducation {
  /** One honest line: what is drawn. The catalogue row's subtitle reads this too. */
  readonly what: string;
}

/** The ⓘ id an indicator row uses (`educationFor` resolves it). */
export const indicatorEducationId = (name: string): string => `IND:${name}`;

type Src = "close" | "ohlc" | "hl" | "oc" | "volume" | "tape";

const SRC_WORDS: Record<Src, string> = {
  close: "the loaded bars' closing prices",
  ohlc: "the loaded bars' open, high, low and close",
  hl: "the loaded bars' highs and lows",
  oc: "the loaded bars' opens and closes, against their high–low range",
  volume: "the loaded bars' prices and traded volume",
  tape: "per-trade prints that state which side crossed the spread",
};

function ladder(src: Src, win: number | null): Pick<InventionEducation, "needs" | "evidence" | "full" | "partial" | "degraded"> {
  const needs: EvidenceNeed = src === "volume" ? "VOLUME" : src === "tape" ? "SIDED_TAPE" : "PRICE";
  const short = win && win > 1
    ? `Fewer than ${win} bars loaded — the first ${win} bars carry no value, so the reading starts late.`
    : "Very few bars loaded — the reading covers only what is there.";
  if (needs === "VOLUME") {
    return {
      needs,
      evidence: `Price only is not enough: it reads ${SRC_WORDS.volume}.`,
      full: "Every bar carries the traded volume the exchange feed reported.",
      partial: `Some bars report zero or partial volume (thin hours, some delayed or index feeds) — those bars pull the reading toward zero. ${short}`,
      degraded: "No central traded volume (spot FX, spot metals) — the volume terms are zero, so what draws is flat or meaningless. Leave it off on those markets.",
    };
  }
  if (needs === "SIDED_TAPE") {
    return {
      needs,
      evidence: "Per-trade prints that state which side crossed the spread.",
      full: "Every print carries a stated aggressor side — the bars are measured, not estimated.",
      partial: "Only the bars the tape was heard on are drawn; earlier bars stay empty rather than estimated.",
      degraded: "No sided tape on this symbol — nothing is drawn; it never falls back to candle colour.",
    };
  }
  return {
    needs,
    evidence: `Price only: ${SRC_WORDS[src]}. No volume, no tape.`,
    full: "Built from the loaded bars — price is all it needs, so FULL is its normal state.",
    partial: short,
    degraded: "No bars loaded, or a frozen feed repeating one price — nothing useful draws.",
  };
}

interface Spec {
  what: string;
  q: string;
  src: Src;
  win: number | null;
  appears: string;
  read: string;
  touch?: string;
}

function rec(s: Spec): IndicatorEducation {
  return {
    what: s.what,
    question: s.q,
    ...ladder(s.src, s.win),
    appears: s.appears,
    grammar: s.read,
    firstTouch: s.touch ?? s.what,
    silence: ladder(s.src, s.win).degraded,
    canon: s.src === "volume" ? "Classic indicator · price + bar volume" : s.src === "tape" ? "Order flow · sided tape" : "Classic indicator · price only",
  };
}

const ON_PRICE = "A line on the price scale, over the candles.";
const OWN_PANE = (shape: string) => `${shape} in its own pane below the candles, with its own scale.`;

const MA_READ = "The line is an average of past closes, so it trails price. Price above the line means closes have been higher than the average; the slope shows whether the average is rising or falling. A longer window moves more slowly.";

function ema(n: number): IndicatorEducation {
  return rec({
    what: `${n}-period exponential moving average of the close`,
    q: `Where has price averaged over about the last ${n} bars, with recent bars counting more?`,
    src: "close", win: n, appears: `${ON_PRICE} Default length ${n}; the gear can change it.`,
    read: MA_READ,
  });
}
function sma(n: number): IndicatorEducation {
  return rec({
    what: `${n}-period simple moving average of the close`,
    q: `What is the plain average close of the last ${n} bars?`,
    src: "close", win: n, appears: `${ON_PRICE} Default length ${n}; the gear can change it.`,
    read: MA_READ,
  });
}
function ma(name: string, how: string, n: number): IndicatorEducation {
  return rec({
    what: `${name} of the close (${how})`,
    q: "Where has price averaged recently, with less lag than a simple average?",
    src: "close", win: n, appears: `${ON_PRICE} Window ${n}.`,
    read: `${MA_READ} This variant reacts faster than a simple average of the same length, and overshoots more on sharp turns.`,
  });
}

const RANGE_OSC_READ = (lo: number, hi: number) =>
  `Dashed guides at ${lo} and ${hi}. Above ${hi} means the close sits near the top of its recent range; below ${lo}, near the bottom. That describes where price is — it does not say price must turn.`;

const PIVOT_NOTE = "Computed from the PRIOR COMPLETED session's high, low and close (the chart's own session clock), so the levels hold still all session. If no completed prior session is loaded, nothing is drawn.";

export const INDICATOR_EDUCATION: Readonly<Record<string, IndicatorEducation>> = {
  // ── Trend ───────────────────────────────────────────────────
  VWAP: rec({
    what: "Session volume-weighted average price",
    q: "What is the average price paid this session, weighted by how much traded at each price?",
    src: "volume", win: null,
    appears: "A line on the price scale that restarts at each session open (the chart's session clock) and is not joined across sessions. Withheld on daily and longer bars, with the reason on the chart.",
    read: "Each bar's typical price (high + low + close) / 3 counts in proportion to its volume, summed from the session open. Price above the line means it trades above this session's volume-weighted average so far.",
  }),
  "VWAP Bands": rec({
    what: "Session VWAP with ±1σ and ±2σ bands",
    q: "How far is price from this session's volume-weighted average, in standard deviations?",
    src: "volume", win: null,
    appears: "The session VWAP line plus two pairs of bands, restarting each session. Bands start each session at zero width.",
    read: "σ is the volume-weighted spread of typical price around the session VWAP. Price at the +2σ band is two of those spreads above the average — a distance, not a turning point.",
  }),
  "Anchored VWAP": rec({
    what: "Volume-weighted average price from the first loaded bar",
    q: "What is the volume-weighted average price since the start of the loaded history?",
    src: "volume", win: null,
    appears: `${ON_PRICE} Anchored to the first bar the chart loaded — there is no anchor picker yet.`,
    read: "The line accumulates price × volume from the anchor. Changing the timeframe or history depth moves the anchor, so the line changes with it.",
  }),
  "EMA 8": ema(8), "EMA 13": ema(13), "EMA 21": ema(21), "EMA 34": ema(34), "EMA 50": ema(50),
  "EMA 89": ema(89), "EMA 144": ema(144), "EMA 200": ema(200),
  "SMA 9": sma(9), "SMA 20": sma(20), "SMA 50": sma(50), "SMA 100": sma(100), "SMA 200": sma(200),
  WMA: ma("Weighted moving average", "20 bars, linearly weighted toward the newest", 20),
  HMA: ma("Hull moving average", "20 bars, weighted averages combined to cut lag", 20),
  DEMA: ma("Double exponential moving average", "20 bars, 2×EMA − EMA of EMA", 20),
  TEMA: ma("Triple exponential moving average", "20 bars, three stacked EMAs", 20),
  ALMA: ma("Arnaud Legoux moving average", "9 bars, Gaussian weights offset 0.85", 9),
  "T3 Moving Average": ma("Tillson T3 average", "5 bars, six smoothed EMAs, volume factor 0.7", 5),
  ZLEMA: ma("Zero-lag exponential moving average", "20 bars, EMA of a lag-corrected close", 20),
  KAMA: rec({
    what: "Kaufman adaptive moving average of the close (10, fast 2, slow 30)",
    q: "Where has price averaged, with the average speeding up when price moves cleanly and slowing when it chops?",
    src: "close", win: 10, appears: ON_PRICE,
    read: "The smoothing speed follows the efficiency ratio: net move over total path in the window. A flat KAMA means recent movement went nowhere net.",
  }),
  "McGinley Dynamic": rec({
    what: "McGinley Dynamic average of the close (14)",
    q: "Where has price averaged, with the average adjusting its own speed to how far price is from it?",
    src: "close", win: 14, appears: ON_PRICE,
    read: "Like a moving average, but it catches up faster when price runs away from it. It trails price; it does not lead it.",
  }),
  "Moving Average Ribbon": rec({
    what: "Six EMAs of the close (8, 13, 21, 34, 55, 89)",
    q: "Are the short and long averages stacked in order, or tangled?",
    src: "close", win: 89,
    appears: "Six lines on the price scale, shaded from light (short) to dark (long).",
    read: "Lines in order (short above long, or below) mean recent closes sit consistently on one side of older ones. Tangled lines mean the averages agree on nothing.",
  }),
  "Bollinger Bands": rec({
    what: "20-bar simple average of the close with bands 2 standard deviations away",
    q: "How wide is price's recent spread around its average, and where is price inside it?",
    src: "close", win: 20, appears: "Three lines on the price scale: the average and an upper and lower band. Length and width can be changed in the gear.",
    read: "The bands widen when closes spread out and narrow when they cluster. A close outside a band is more than two standard deviations from the 20-bar average — a measure of distance, not a cue.",
  }),
  "Bollinger Band Width": rec({
    what: "Bollinger Band width as a percent of the middle line",
    q: "Is the spread of closes narrowing or widening?",
    src: "close", win: 20, appears: OWN_PANE("A line"),
    read: "(Upper − lower) ÷ middle × 100. Low readings mean the 20-bar spread is tight compared with its own history on this chart.",
  }),
  "Ichimoku Cloud": rec({
    what: "Ichimoku lines: conversion (9), base (26), span A, span B (52), lagging close",
    q: "Where do the midpoints of the 9-, 26- and 52-bar ranges sit relative to price?",
    src: "hl", win: 52,
    appears: "Five lines on the price scale. The two spans are plotted 26 bars after the bar they are computed on, and the lagging line is the close plotted 26 bars back, so its newest 26 slots are empty. The chart has no future slots, so the spans do not extend past the newest candle.",
    read: "Each line is the middle of a high–low range: conversion over 9 bars, base over 26, span B over 52; span A is the average of conversion and base. Read them as range midpoints.",
  }),
  Supertrend: rec({
    what: "ATR trailing line (10 bars, 3 × ATR) that flips side when the close crosses it",
    q: "Has price closed beyond a volatility-sized distance from its recent extreme?",
    src: "ohlc", win: 10,
    appears: "One line on the price scale: green while below price, red while above. It changes colour when the close crosses it.",
    read: "The line sits 3 ATRs from the bar's midpoint and only ratchets in one direction until a close crosses it. A flip records that a close crossed it — nothing more.",
  }),
  "Keltner Channel": rec({
    what: "20-bar EMA of the close with bands 2 ATRs away",
    q: "How far is price from its average, measured in average true range?",
    src: "ohlc", win: 20, appears: "Three lines on the price scale. Length and width can be changed in the gear.",
    read: "Band width follows the 20-bar ATR, so it widens when bars get bigger. A close outside the channel is more than 2 ATRs from the EMA.",
  }),
  "Donchian Channel": rec({
    what: "Highest high and lowest low of the last 20 bars, with the midpoint",
    q: "What are the extremes of the last 20 bars?",
    src: "hl", win: 20, appears: "Three lines on the price scale.",
    read: "The upper line is the 20-bar high, the lower line the 20-bar low. A new line value means a new 20-bar extreme printed.",
  }),
  "Price Channel": rec({
    what: "Highest high and lowest low of the last 20 bars",
    q: "What are the extremes of the last 20 bars?",
    src: "hl", win: 20, appears: "Two lines on the price scale.",
    read: "Same extremes as the Donchian channel, without the midpoint.",
  }),
  Envelope: rec({
    what: "20-bar simple average of the close with lines 2.5% above and below",
    q: "Where is price relative to a fixed percentage band around its average?",
    src: "close", win: 20, appears: "Three lines on the price scale.",
    read: "The band is a fixed 2.5% of the average, so it does not adapt to volatility. Price outside it is more than 2.5% from the 20-bar average.",
  }),
  "Parabolic SAR": rec({
    what: "Parabolic stop-and-reverse line (step 0.02, max 0.2)",
    q: "Where does the parabolic trailing level sit, and which side of price is it on?",
    src: "hl", win: 2, appears: "A dashed line on the price scale.",
    read: "The level accelerates toward price each bar a new extreme prints and switches side when price crosses it. A switch records the cross.",
  }),
  "Linear Regression": rec({
    what: "End point of a 14-bar least-squares line through the closes",
    q: "Where does a straight-line fit of the last 14 closes end?",
    src: "close", win: 14, appears: "A dashed line on the price scale.",
    read: "Each point is where the best-fit line of the previous 14 closes lands on that bar. It trails price like an average.",
  }),
  "Linear Regression Channel": rec({
    what: "100-bar regression line with bands 2 standard errors away",
    q: "How far is price from the straight-line fit of the last 100 closes?",
    src: "close", win: 100, appears: "Three lines on the price scale.",
    read: "The middle is the regression end point; the bands sit two standard deviations of the fit's errors above and below.",
  }),
  Alligator: rec({
    what: "Williams Alligator: averages of the bar midpoint (13, 8, 5) shifted forward 8, 5 and 3 bars",
    q: "Are three shifted midpoint averages spread apart or intertwined?",
    src: "hl", win: 13, appears: "Three lines on the price scale (blue jaw, gold teeth, green lips).",
    read: "Spread-out lines in order mean recent midpoints are moving one way; intertwined lines mean they are not.",
  }),

  // ── Pivots ──────────────────────────────────────────────────
  "Pivot Points Standard": rec({
    what: "Standard floor pivots (P, R1–R3, S1–S3) from the prior completed session's high, low and close",
    q: "Where do the standard pivot formulas put levels for these numbers?",
    src: "ohlc", win: null, appears: "Seven flat lines across the chart: gold P, red R1–R3, green S1–S3.",
    read: `P = (H + L + C) / 3; R and S levels step out by the range. ${PIVOT_NOTE}`,
  }),
  "Pivot Points Fibonacci": rec({
    what: "Fibonacci pivots: P ± 0.382 / 0.618 / 1.0 × range, from the prior completed session",
    q: "Where do the Fibonacci pivot formulas put levels for these numbers?",
    src: "ohlc", win: null, appears: "Seven flat lines across the chart.",
    read: `P = (H + L + C) / 3; levels are P plus or minus fractions of that session's range. ${PIVOT_NOTE}`,
  }),
  "Pivot Points Camarilla": rec({
    what: "Camarilla levels: close ± 1.083 / 1.167 / 1.25 × range, from the prior completed session",
    q: "Where do the Camarilla formulas put levels around the close?",
    src: "ohlc", win: null, appears: "Seven flat lines across the chart.",
    read: `Levels are that session's close plus or minus multiples of its range. ${PIVOT_NOTE}`,
  }),
  "Pivot Points Woodie": rec({
    what: "Woodie pivots: P = (H + L + 2C) / 4, from the prior completed session",
    q: "Where do the Woodie formulas put levels, weighting the close double?",
    src: "ohlc", win: null, appears: "Seven flat lines across the chart.",
    read: `Same steps as the standard pivots around a close-weighted P. ${PIVOT_NOTE}`,
  }),
  "Pivot Points Demark": rec({
    what: "DeMark pivots (P, R1, S1) from the prior completed session",
    q: "Where does DeMark's open-vs-close rule put one level above and one below?",
    src: "ohlc", win: null, appears: "Three flat lines across the chart.",
    read: `The formula weights the high or low double depending on whether that session closed below or above its open. ${PIVOT_NOTE}`,
  }),
  "Pivot Points CPR": rec({
    what: "Central pivot range levels from the prior completed session",
    q: "Where do the central pivot formulas put P and its R / S levels?",
    src: "ohlc", win: null, appears: "Seven flat lines across the chart (the top and bottom central lines are computed but not drawn).",
    read: `P = (H + L + C) / 3 with standard R1–R3 and S1–S3. ${PIVOT_NOTE}`,
  }),

  // ── Momentum ────────────────────────────────────────────────
  RSI: rec({
    what: "Relative Strength Index of the close (14)",
    q: "Over the last 14 bars, how large were the up-closes compared with the down-closes?",
    src: "close", win: 14, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30, 50 and 70. Length can be changed in the gear.`,
    read: `RSI = 100 − 100 / (1 + average gain ÷ average loss). ${RANGE_OSC_READ(30, 70)}`,
  }),
  ConnorsRSI: rec({
    what: "Connors RSI: average of a 3-bar RSI, a 2-bar streak RSI and a 100-bar percent rank",
    q: "How stretched is the latest move by three short-term measures combined?",
    src: "close", win: 100, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30 and 70.`,
    read: `Each part is 0–100; the line is their average. ${RANGE_OSC_READ(30, 70)}`,
  }),
  "Stoch RSI": rec({
    what: "Stochastic of the 14-bar RSI (14, smoothed 3 and 3)",
    q: "Where is RSI inside its own recent range?",
    src: "close", win: 28, appears: `${OWN_PANE("Two lines (%K blue, %D gold) from 0 to 100")} Guides at 20 and 80.`,
    read: `%K places the current RSI within its 14-bar high–low; %D is its 3-bar average. ${RANGE_OSC_READ(20, 80)}`,
  }),
  MACD: rec({
    what: "MACD (12, 26, 9): EMA difference, its signal line and the histogram",
    q: "Is the short average pulling away from the long one, or closing in?",
    src: "close", win: 35, appears: OWN_PANE("A histogram plus two lines (MACD blue, signal gold)"),
    read: "MACD = EMA12 − EMA26 of the close; the signal line is a 9-bar EMA of MACD; the histogram is their difference. Bars above zero mean MACD is above its signal line.",
  }),
  "MACD Histogram": rec({
    what: "MACD (12, 26, 9) with its histogram",
    q: "How far is MACD from its signal line, bar by bar?",
    src: "close", win: 35, appears: OWN_PANE("A histogram plus the MACD and signal lines"),
    read: "Draws the same pane as MACD. Histogram = MACD − signal; green above zero, red below.",
  }),
  "MACD Signal": rec({
    what: "MACD (12, 26, 9) line and signal line, without the histogram",
    q: "Where are the MACD line and its signal line relative to each other?",
    src: "close", win: 35, appears: OWN_PANE("Two lines (MACD blue, signal gold)"),
    read: "A cross is the bar where MACD moved from one side of its signal line to the other. There are no alerts — the lines are drawn, nothing is sent.",
  }),
  Stochastic: rec({
    what: "Stochastic oscillator (14, 3, 3)",
    q: "Where did the close land inside the last 14 bars' high–low range?",
    src: "ohlc", win: 14, appears: `${OWN_PANE("Two lines (%K, %D) from 0 to 100")} Guides at 20 and 80.`,
    read: `%K = (close − 14-bar low) ÷ (14-bar high − low) × 100, smoothed; %D averages %K. ${RANGE_OSC_READ(20, 80)}`,
  }),
  "Stochastic Momentum Index": rec({
    what: "Stochastic Momentum Index (13, 25, 2) and its signal line",
    q: "How far is each close from its own bar's midpoint, measured against the 13-bar range and smoothed?",
    src: "ohlc", win: 25, appears: `${OWN_PANE("Two lines")} Guides at −40 and +40.`,
    read: "SMI = (close − the bar's own midpoint), smoothed twice over 2 bars, divided by half the smoothed 13-bar range, × 100; the signal line is a 25-bar EMA of it. Above +40 the closes have been well above their bars' midpoints relative to the range; below −40, well below.",
  }),
  CCI: rec({
    what: "Commodity Channel Index (20)",
    q: "How far is the typical price from its 20-bar average, in units of its mean deviation?",
    src: "ohlc", win: 20, appears: `${OWN_PANE("A line")} Guides at −100, 0 and +100.`,
    read: "CCI = (typical price − its 20-bar average) ÷ (0.015 × mean deviation). Beyond ±100 the distance is larger than usual for this window.",
  }),
  "Williams %R": rec({
    what: "Williams %R (14)",
    q: "How far below the 14-bar high did the close land?",
    src: "ohlc", win: 14, appears: `${OWN_PANE("A line from −100 to 0")} Guides at −80 and −20.`,
    read: "%R = (14-bar high − close) ÷ (14-bar range) × −100. Near 0 the close is at the top of the range; near −100, at the bottom.",
  }),
  "Awesome Oscillator": rec({
    what: "5-bar minus 34-bar simple average of the bar midpoint",
    q: "Is the short-term midpoint average above or below the longer one, and is the gap growing?",
    src: "hl", win: 34, appears: OWN_PANE("A histogram"),
    read: "Bars above zero: the 5-bar midpoint average is above the 34-bar. A bar is green when it is higher than the previous bar, red when lower.",
  }),
  "Accelerator Oscillator": rec({
    what: "Awesome Oscillator minus its own 5-bar average",
    q: "Is the Awesome Oscillator speeding up or slowing down?",
    src: "hl", win: 39, appears: OWN_PANE("A histogram"),
    read: "Green when the bar is higher than the last, red when lower. It describes change in AO, not direction of price.",
  }),
  "Rate of Change": rec({
    what: "Percent change of the close over 12 bars",
    q: "How much has the close changed, in percent, versus 12 bars ago?",
    src: "close", win: 12, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "ROC = (close ÷ close 12 bars ago − 1) × 100. Above zero the close is higher than 12 bars ago.",
  }),
  Momentum: rec({
    what: "Close minus the close 10 bars ago",
    q: "How far has the close moved, in price, over 10 bars?",
    src: "close", win: 10, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Positive: the close is higher than 10 bars ago, by that many price units.",
  }),
  "Ultimate Oscillator": rec({
    what: "Ultimate Oscillator (7, 14, 28)",
    q: "How much of each bar's true range was buying pressure, averaged over three windows?",
    src: "ohlc", win: 28, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30 and 70.`,
    read: "Each window sums (close − true low) ÷ true range; the three are weighted 4:2:1. Here 'buying pressure' is a price formula, not traded side.",
  }),
  TSI: rec({
    what: "True Strength Index (25, 13)",
    q: "What is the double-smoothed close-to-close change, as a share of its absolute size?",
    src: "close", win: 38, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Above zero the smoothed changes have been up on balance; the further from zero, the more one-sided.",
  }),
  "Relative Vigor Index": rec({
    what: "Relative Vigor Index (10) and its signal line",
    q: "Have bars been closing above or below their opens, relative to their range?",
    src: "oc", win: 10, appears: OWN_PANE("Two lines (RVI blue, signal gold)"),
    read: "RVI averages (close − open) over (high − low). Above zero the bars closed above their opens on balance.",
  }),
  KDJ: rec({
    what: "KDJ (9, 3, 3): stochastic %K, %D and J = 3K − 2D",
    q: "Where did the close land in the 9-bar range, with an extended J line?",
    src: "ohlc", win: 9, appears: OWN_PANE("Three lines (K, D, J)"),
    read: "K and D are a smoothed stochastic; J exaggerates their gap and can run outside 0–100.",
  }),
  "Coppock Curve": rec({
    what: "10-bar weighted average of the 14- and 11-bar rates of change",
    q: "What is the smoothed sum of two medium-term rates of change?",
    src: "close", win: 24, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Above zero the smoothed rate of change is positive. The original was designed for monthly index data; on intraday bars the same arithmetic runs over bars.",
  }),
  "Elder Ray Index": rec({
    what: "Bull power (high − EMA13) and bear power (low − EMA13)",
    q: "How far did each bar's high and low reach beyond the 13-bar EMA?",
    src: "ohlc", win: 13, appears: OWN_PANE("Two lines (green bull, red bear)"),
    read: "Bull power above zero: the high was above the EMA. Bear power below zero: the low was below it. Price formulas only.",
  }),
  TRIX: rec({
    what: "Rate of change of a triple-smoothed 18-bar EMA",
    q: "Is the triple-smoothed average rising or falling?",
    src: "close", win: 54, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Above zero the triple EMA rose on the bar. Heavy smoothing makes it slow.",
  }),
  PPO: rec({
    what: "Percentage Price Oscillator (12, 26, 9)",
    q: "How far apart are the 12- and 26-bar EMAs, as a percent of the slower one?",
    src: "close", win: 35, appears: OWN_PANE("A histogram plus two lines"),
    read: "MACD expressed in percent, so it compares across prices. Histogram = PPO − signal.",
  }),
  DPO: rec({
    what: "Detrended Price Oscillator (20)",
    q: "How far is price from a shifted 20-bar average — the swing with the trend removed?",
    src: "close", win: 20, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Positive: price is above the displaced average. It is built to show cycle length, not direction.",
  }),
  "Chande Momentum Oscillator": rec({
    what: "Chande Momentum Oscillator (14)",
    q: "Over 14 bars, what share of the close-to-close movement was up versus down?",
    src: "close", win: 14, appears: `${OWN_PANE("A line from −100 to +100")} Guides at −50 and +50.`,
    read: "CMO = (sum of up moves − sum of down moves) ÷ (their total) × 100. +50 means up moves outweighed down moves three to one.",
  }),
  "Balance of Power": rec({
    what: "(close − open) ÷ (high − low), per bar",
    q: "How much of each bar's range did the open-to-close move cover, and which way?",
    src: "oc", win: 1, appears: `${OWN_PANE("A line from −1 to +1")} Guide at 0.`,
    read: "+1: the bar opened at its low and closed at its high. A price ratio — it does not measure who traded.",
  }),
  "Waddah Attar Explosion": rec({
    what: "Bollinger Band width, coloured by the sign of a MACD (20, 40, 9) histogram",
    q: "How wide are the 20-bar bands, and is the slower MACD above or below its signal?",
    src: "close", win: 49, appears: OWN_PANE("A histogram — green when the MACD histogram is positive, red when negative"),
    read: "Bar height is the band width (upper − lower). Colour is the MACD side. No explosion line or dead-zone line is drawn.",
  }),
  "TTM Squeeze": rec({
    what: "Squeeze: Bollinger Bands (20, 2) inside Keltner (20, 1.5), with a momentum histogram",
    q: "Are the Bollinger Bands inside the Keltner Channel, and where is the close relative to the channel middle?",
    src: "ohlc", win: 20, appears: OWN_PANE("A histogram — solid colours while the bands are inside the channel, faded otherwise"),
    read: "Histogram = 5-bar EMA of (close − Keltner midpoint). Solid bars mark bars where the bands sat inside the channel (a narrow spread).",
  }),
  "Squeeze Momentum": rec({
    what: "Same squeeze histogram as TTM Squeeze",
    q: "Are the Bollinger Bands inside the Keltner Channel, and where is the close relative to the channel middle?",
    src: "ohlc", win: 20, appears: OWN_PANE("A histogram — the same pane TTM Squeeze draws"),
    read: "Identical arithmetic to TTM Squeeze on this chart (bands 20 / 2 inside Keltner 20 / 1.5; histogram = 5-bar EMA of close − channel midpoint).",
  }),
  "Schaff Trend Cycle": rec({
    what: "Schaff Trend Cycle (23, 50, 10)",
    q: "Where is the MACD inside its own recent range, smoothed twice?",
    src: "close", win: 60, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 25 and 75.`,
    read: `A stochastic applied twice to the 23 / 50 MACD. ${RANGE_OSC_READ(25, 75)}`,
  }),

  // ── Volume ──────────────────────────────────────────────────
  Volume: rec({
    what: "Traded volume per bar",
    q: "How much traded in each bar?",
    src: "volume", win: null, appears: OWN_PANE("A histogram"),
    read: "Bar height is the bar's volume. Colour follows the CANDLE (close above or below open) — it does not say who bought or sold.",
  }),
  "Volume MA": rec({
    what: "20-bar simple average of bar volume",
    q: "What is the average volume of the last 20 bars?",
    src: "volume", win: 20,
    appears: OWN_PANE("A line in volume units"),
    read: "The plain average of the last 20 bars' volume. A bar above the line traded more than that average; it says nothing about direction.",
  }),
  RVOL: rec({
    what: "Bar volume ÷ the average of the last 20 bars' volume",
    q: "Is this bar trading more or less than the recent bars?",
    src: "volume", win: 20, appears: `${OWN_PANE("A line")} Guide at 1.`,
    read: "1 means average for the last 20 BARS (not 20 days, and not the same time of day). 2 means twice that.",
  }),
  OBV: rec({
    what: "On-Balance Volume: running total adding volume on up-closes, subtracting on down-closes",
    q: "Has volume landed more on up-closing bars or down-closing bars over the loaded history?",
    src: "volume", win: null, appears: OWN_PANE("A line"),
    read: "Only the slope matters; the level depends on where the history starts. The side is the close's direction, not traded side.",
  }),
  "Money Flow Index": rec({
    what: "Money Flow Index (14): an RSI of typical price × volume",
    q: "Over 14 bars, how did volume on rising typical prices compare with volume on falling ones?",
    src: "volume", win: 14, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 20 and 80.`,
    read: `Same shape as RSI with volume in the weights. ${RANGE_OSC_READ(20, 80)}`,
  }),
  "Chaikin Money Flow": rec({
    what: "Chaikin Money Flow (20)",
    q: "Over 20 bars, did volume land with closes near the highs or near the lows?",
    src: "volume", win: 20, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Each bar's close location in its range (−1 at the low, +1 at the high) is weighted by volume and summed. Above zero: closes sat in the upper half on balance.",
  }),
  "Chaikin Oscillator": rec({
    what: "3-bar EMA minus 10-bar EMA of the accumulation / distribution line",
    q: "Is the accumulation / distribution line rising faster or slower than its longer average?",
    src: "volume", win: 10, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Above zero the short average of A/D is above the long one.",
  }),
  "Accumulation/Distribution": rec({
    what: "Running total of each bar's close location × its volume",
    q: "Has volume landed more with closes near bar highs or near bar lows?",
    src: "volume", win: null, appears: OWN_PANE("A line"),
    read: "Read the slope, not the level. 'Accumulation' here is a price-location formula, not observed buying.",
  }),
  "Ease of Movement": rec({
    what: "Ease of Movement (14): midpoint change per unit of volume and range",
    q: "How far did price move for the volume that traded?",
    src: "volume", win: 14, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Large positive values: the midpoint rose on light volume relative to the range. Near zero: little movement for the volume.",
  }),
  "Force Index": rec({
    what: "13-bar EMA of (close change × volume)",
    q: "How large were the price changes, weighted by the volume behind them?",
    src: "volume", win: 13, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "Above zero: up-closes on volume outweighed down-closes recently.",
  }),
  "Klinger Oscillator": rec({
    what: "Klinger volume oscillator (34, 55) and its signal line",
    q: "Is volume flowing with rising or falling typical prices, by a long-window comparison?",
    src: "volume", win: 55, appears: OWN_PANE("Two lines (oscillator blue, signal gold)"),
    read: "Volume is signed by the direction of typical price and compared across a 34- and 55-bar EMA.",
  }),
  "Price Volume Trend": rec({
    what: "Running total of volume × percent change of the close",
    q: "Has volume been arriving with rising or falling closes, scaled by the size of the change?",
    src: "volume", win: null, appears: OWN_PANE("A line"),
    read: "Read the slope. Like OBV, but each bar's volume is scaled by how much the close changed.",
  }),
  "Negative Volume Index": rec({
    what: "Index that changes only on bars whose volume fell versus the previous bar",
    q: "How has price moved on the quieter bars?",
    src: "volume", win: null, appears: OWN_PANE("A line"),
    read: "On a bar with lower volume than the last, the index moves by the close's percent change; otherwise it holds.",
  }),
  "Positive Volume Index": rec({
    what: "Index that changes only on bars whose volume rose versus the previous bar",
    q: "How has price moved on the busier bars?",
    src: "volume", win: null, appears: OWN_PANE("A line"),
    read: "On a bar with higher volume than the last, the index moves by the close's percent change; otherwise it holds.",
  }),
  VWMA: rec({
    what: "20-bar volume-weighted moving average of the close",
    q: "What is the average close of the last 20 bars, weighting busy bars more?",
    src: "volume", win: 20, appears: ON_PRICE,
    read: `${MA_READ} Bars with more volume pull the average harder.`,
  }),
  "Volume Oscillator": rec({
    what: "5-bar vs 10-bar average volume, in percent",
    q: "Is short-term volume above or below the slightly longer average?",
    src: "volume", win: 10, appears: `${OWN_PANE("A line")} Guide at 0.`,
    read: "(5-bar avg − 10-bar avg) ÷ 10-bar avg × 100. Above zero: recent bars are busier.",
  }),
  "Volume Weighted RSI": rec({
    what: "RSI (14) with each gain and loss weighted by its bar's volume",
    q: "Weighted by volume, were the recent up-closes larger than the down-closes?",
    src: "volume", win: 14, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30 and 70.`,
    read: `RSI arithmetic with volume in the averages. ${RANGE_OSC_READ(30, 70)}`,
  }),

  // ── Volatility ──────────────────────────────────────────────
  ATR: rec({
    what: "Average True Range (14)",
    q: "How large have the bars been, including gaps?",
    src: "ohlc", win: 14, appears: OWN_PANE("A line in price units"),
    read: "True range = the largest of high − low, |high − previous close|, |low − previous close|; ATR averages it. It measures size, not direction.",
  }),
  "Normalized ATR": rec({
    what: "ATR (14) as a percent of the close",
    q: "How large are the bars relative to price?",
    src: "ohlc", win: 14, appears: OWN_PANE("A line in percent"),
    read: "ATR ÷ close × 100, so symbols at different prices can be compared.",
  }),
  "Chaikin Volatility": rec({
    what: "10-bar rate of change of ATR (14)",
    q: "Is the average bar size growing or shrinking?",
    src: "ohlc", win: 24, appears: OWN_PANE("A line"),
    read: "Above zero: ATR is larger than 10 bars ago. (This chart uses ATR, not the original high–low EMA spread.)",
  }),
  "Historical Volatility": rec({
    what: "Standard deviation of 20 log returns, scaled by √252, in percent",
    q: "How variable have the close-to-close returns been?",
    src: "close", win: 20, appears: OWN_PANE("A line in percent"),
    read: "The √252 scale assumes daily bars; on intraday bars the number is per-bar variability scaled as if each bar were a day, so compare it only with itself.",
  }),
  "Realized Volatility": rec({
    what: "Standard deviation of 10 log returns, scaled by √252, in percent",
    q: "How variable have the last 10 close-to-close returns been?",
    src: "close", win: 10, appears: OWN_PANE("A line in percent"),
    read: "Same arithmetic as Historical Volatility over a 10-bar window (not 5 days). Compare it only with itself on the same timeframe.",
  }),
  "BB Width": rec({
    what: "Bollinger Band width as a percent of the middle line (20, 2)",
    q: "Is the spread of closes narrowing or widening?",
    src: "close", win: 20, appears: OWN_PANE("A line"),
    read: "Same arithmetic as Bollinger Band Width, in a separate pane.",
  }),
  "KC Width": rec({
    what: "Keltner Channel width as a percent of its middle line (20, 2)",
    q: "Is the ATR-sized channel narrowing or widening relative to price?",
    src: "ohlc", win: 20, appears: OWN_PANE("A line"),
    read: "(Upper − lower) ÷ middle × 100 = 4 × ATR ÷ EMA × 100.",
  }),
  "Volatility Stop": rec({
    what: "Close ± 1.5 × ATR (20), both sides, every bar",
    q: "Where is one and a half ATRs from each close?",
    src: "ohlc", win: 20, appears: "Two dotted lines on the price scale (red above, green below).",
    read: "The lines follow each close — they do not ratchet or flip like a trailing stop. They show a volatility-sized distance only.",
  }),
  "Standard Deviation": rec({
    what: "Standard deviation of the last 20 closes",
    q: "How spread out have the last 20 closes been, in price units?",
    src: "close", win: 20, appears: OWN_PANE("A line in price units"),
    read: "Larger values mean closes were further from their 20-bar average.",
  }),
  "Donchian Width": rec({
    what: "20-bar high minus 20-bar low",
    q: "How wide is the last 20 bars' range?",
    src: "hl", win: 20, appears: OWN_PANE("A line in price units"),
    read: "The distance between the Donchian channel's upper and lower lines.",
  }),
  "Mass Index": rec({
    what: "Mass Index (9, 25): sum of the ratio of two EMAs of the bar range",
    q: "Is the bar range expanding relative to its own smoothed average?",
    src: "hl", win: 34, appears: OWN_PANE("A line"),
    read: "Rises when ranges widen faster than their smoothed version. It has no direction.",
  }),
  "Ulcer Index": rec({
    what: "Ulcer Index (14): depth of closes below their 14-bar peak",
    q: "How far, and how persistently, have closes been below their recent high?",
    src: "close", win: 14, appears: OWN_PANE("A line in percent"),
    read: "Zero when every close in the window is at its high. Larger means deeper, longer drawdowns inside the window.",
  }),
  "Parkinson Volatility": rec({
    what: "Parkinson high–low volatility (20 bars), scaled by √252, in percent",
    q: "How large have the bars' high–low ranges been, in volatility terms?",
    src: "hl", win: 20, appears: OWN_PANE("A line in percent"),
    read: "Uses only each bar's high and low. The √252 scale assumes daily bars; compare it only with itself on one timeframe.",
  }),

  // ── Structure (price-only; filed under Order Flow / Smart Money in older menus) ─
  "Supply/Demand Zones": rec({
    what: "Boxes at swing highs and swing lows of the last 200 bars — price structure only",
    q: "Where are the recent swing highs and lows, as zones?",
    src: "hl", win: 11,
    appears: "Pairs of lines on the price scale from each swing to the newest bar: pink at swing highs (the top 40% of that bar), green at swing lows (the bottom 40%).",
    read: "A swing high is a bar whose high is the highest of the 5 bars either side. The zone marks where that swing printed. Nothing about orders or sides is read — it is price only.",
  }),
  "Stop Run Alert": rec({
    what: "Bars that broke the prior 5 bars' high or low and closed back inside — price only",
    q: "Which bars poked beyond the last 5 bars' range and closed back inside it?",
    src: "ohlc", win: 5,
    appears: OWN_PANE("A histogram: +100 for a high poked and closed back below, −100 for a low poked and closed back above"),
    read: "It marks the price shape only. No stops, orders or tape are read, and no alert is sent.",
  }),
  "Tape CVD": rec({
    what: "Cumulative signed tape — only bars the tape was heard on",
    q: "Since the tape arrived, have buyers or sellers crossed the spread more?",
    src: "tape", win: null,
    appears: OWN_PANE("Candles of the running total (each body spans that bar's change)"),
    read: "Each print adds its size when the buyer crossed the spread and subtracts it when the seller did. Sides are as the feed labelled them; the first bar is hollow; bars before the tape stay empty.",
  }),
  "Order Block Finder": rec({
    what: "The last opposite-colour candle body before a move of more than 2 average ranges in 3 bars",
    q: "Which candles came right before a large 3-bar move the other way?",
    src: "ohlc", win: 4,
    appears: "For the last 5 found, two lines on the price scale (the candle body's top and bottom) from that candle to the newest bar.",
    read: "A purely price rule: a down candle before a 3-bar rise of more than 2× the average bar range (or the mirror). It does not identify who traded.",
  }),
  "Break of Structure": rec({
    what: "Closes beyond the prior 10 bars' high or low",
    q: "Where did a close last break the prior 10 bars' extreme?",
    src: "ohlc", win: 20,
    appears: "For the last 5 breaks, a dashed line at the broken level from the break bar to the newest bar (teal up, violet down).",
    read: "A break is recorded when a close exceeds the highest high (or undercuts the lowest low) of the previous 10 bars. It records the close, nothing more.",
  }),
  "Change of Character": rec({
    what: "Closes across the most recent confirmed swing high or low",
    q: "Where did a close cross the latest swing point?",
    src: "ohlc", win: 9,
    appears: "For the last 8, a short dotted line at the crossing close, 3 bars either side.",
    read: "A swing point needs 4 bars either side to confirm. The mark is the first close beyond it.",
  }),
  "Liquidity Pools": rec({
    what: "Pairs of swing highs (or lows) within 0.12% of each other",
    q: "Where have two swing highs or two swing lows printed at nearly the same price?",
    src: "hl", win: 9,
    appears: "Dashed lines (gold for highs, blue for lows), up to 6 each, at the average of each pair, from the earlier swing to the newest bar.",
    read: "It finds repeated swing prices. Whether resting orders sit there is not observed — no book or tape is read.",
  }),
  "Strong Highs/Lows": rec({
    what: "Swing highs not exceeded since, and swing lows not undercut since",
    q: "Which recent swing highs and lows are still unbroken?",
    src: "hl", win: 11,
    appears: "Solid lines (red at highs, teal at lows) from each unbroken swing to the newest bar, from the last 12 swings of each kind.",
    read: "A line stays while no later bar has traded beyond it. It is a record of what has not happened yet.",
  }),
  "Equal Highs/Lows": rec({
    what: "Adjacent bars whose highs (or lows) are within 0.08% of each other",
    q: "Where did two bars in a row print almost the same high or low?",
    src: "hl", win: 2,
    appears: "Dotted gold lines, the last 8, from the matching bar to the newest bar.",
    read: "Only neighbouring bars are compared. It marks the matching price, nothing more.",
  }),
  "Swing High/Low": rec({
    what: "Confirmed swing highs and swing lows, each as a short rule",
    q: "Where are the recent confirmed swing highs and lows?",
    src: "hl", win: 11,
    appears: "A short dashed rule from each swing's own bar for 8 bars: red at swing highs, green at swing lows.",
    read: "A swing high is a bar whose high is above the 5 bars either side, so it is confirmed 5 bars late. The rule marks where it printed; it is not extended as a level.",
  }),
  "VWAP Deviation Bands": rec({
    what: "Session VWAP with ±1σ, ±2σ and ±3σ bands",
    q: "How far is price from this session's volume-weighted average, in standard deviations?",
    src: "volume", win: null,
    appears: "The session VWAP and three pairs of bands on the price scale, restarting each session.",
    read: "σ is the volume-weighted spread of typical price around the session VWAP. A band is a distance from the average, not a level the market owes.",
  }),

  // ── Oscillators ─────────────────────────────────────────────
  "Fisher Transform": rec({
    what: "Fisher Transform of the 10-bar midpoint position, and its signal line",
    q: "Where is the midpoint inside its 10-bar range, stretched so extremes stand out?",
    src: "hl", win: 10, appears: OWN_PANE("Two lines (Fisher orange, signal blue)"),
    read: "The transform makes readings near the range edges large. The signal line is the previous bar's value.",
  }),
  "Aroon Oscillator": rec({
    what: "Aroon Up minus Aroon Down (25)",
    q: "Was the 25-bar high or the 25-bar low printed more recently?",
    src: "hl", win: 25, appears: OWN_PANE("A line from −100 to +100"),
    read: "+100: the high printed on this bar and the low 25 bars ago. Near zero: both are similarly old.",
  }),
  "Aroon Up/Down": rec({
    what: "Aroon Up and Aroon Down (25)",
    q: "How many bars ago were the 25-bar high and low?",
    src: "hl", win: 25, appears: OWN_PANE("Two lines (green up, red down) from 0 to 100"),
    read: "100 means the extreme printed on this bar; 0 means 25 bars ago.",
  }),
  ADX: rec({
    what: "ADX (14) with +DI and −DI",
    q: "How directional has the movement been, and which side dominated?",
    src: "ohlc", win: 28, appears: `${OWN_PANE("Three lines (ADX gold, +DI green, −DI red)")} Guide at 25.`,
    read: "+DI and −DI compare up-moves and down-moves of the highs and lows; ADX is the smoothed size of their gap, with no direction. Higher ADX = more one-sided movement.",
  }),
  DMI: rec({
    what: "+DI / −DI with ADX (14)",
    q: "Which side of the directional movement dominated over 14 bars?",
    src: "ohlc", win: 28, appears: OWN_PANE("Three lines (the same pane as ADX)"),
    read: "Draws the same pane as ADX. +DI above −DI: up-moves of the highs outweighed down-moves of the lows.",
  }),
  "Vortex Indicator": rec({
    what: "Vortex VI+ and VI− (14)",
    q: "Have highs been reaching further from prior lows, or lows further from prior highs?",
    src: "ohlc", win: 14, appears: OWN_PANE("Two lines (green VI+, red VI−)"),
    read: "VI+ sums |high − previous low|, VI− sums |low − previous high|, each over true range. VI+ above VI−: upward reach dominated.",
  }),
  "Ehlers Fisher": rec({
    what: "Same Fisher Transform as above (10)",
    q: "Where is the midpoint inside its 10-bar range, stretched so extremes stand out?",
    src: "hl", win: 10, appears: OWN_PANE("Two lines — the same pane Fisher Transform draws"),
    read: "This chart computes one Fisher Transform; Ehlers Fisher draws it.",
  }),
  "RVI (Relative Vigor)": rec({
    what: "Same Relative Vigor Index (10) and signal line",
    q: "Have bars been closing above or below their opens, relative to their range?",
    src: "oc", win: 10, appears: OWN_PANE("Two lines — the same pane Relative Vigor Index draws"),
    read: "Identical to Relative Vigor Index on this chart.",
  }),
  "Stochastic Pop": rec({
    what: "Draws the Stochastic Momentum Index (13, 25, 2) — no Bollinger or breakout logic",
    q: "How far is each close from its own bar's midpoint, measured against the 13-bar range and smoothed?",
    src: "ohlc", win: 25, appears: `${OWN_PANE("Two lines — the same pane as Stochastic Momentum Index")} Guides at −40 and +40.`,
    read: "This row draws the SMI. The Bollinger-plus-stochastic 'pop' rule its name suggests is not built.",
  }),
  "Awesome / AC Combo": rec({
    what: "Awesome Oscillator and Accelerator Oscillator as two lines",
    q: "Where are AO and its acceleration, side by side?",
    src: "hl", win: 39, appears: OWN_PANE("Two lines (AO teal, AC gold)"),
    read: "AO = 5-bar − 34-bar midpoint average; AC = AO − its 5-bar average.",
  }),
  "Dual Stochastic": rec({
    what: "Two stochastic %K lines: 14-bar and 5-bar",
    q: "Where did the close land in its 14-bar and its 5-bar range?",
    src: "ohlc", win: 14, appears: OWN_PANE("Two lines (14-bar blue, 5-bar gold)"),
    read: "The 5-bar line moves faster. Each is 0–100: the close's position in that window's range.",
  }),
  "Color RSI": rec({
    what: "Draws a 3-bar EMA of RSI (14) — the same line as Smoothed RSI, with no colour fill",
    q: "What is the smoothed RSI?",
    src: "close", win: 17, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30 and 70.`,
    read: "This row draws the Smoothed RSI. The bull / bear / divergence colouring its name suggests is not built.",
  }),
  "Smoothed RSI": rec({
    what: "3-bar EMA of RSI (14)",
    q: "What is the RSI, smoothed over 3 bars?",
    src: "close", win: 17, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 30 and 70.`,
    read: `A slightly slower RSI. ${RANGE_OSC_READ(30, 70)}`,
  }),
  RVGI: rec({
    what: "Draws the Relative Vigor Index (10) — not a separate volatility index",
    q: "Have bars been closing above or below their opens, relative to their range?",
    src: "oc", win: 10, appears: OWN_PANE("Two lines — the same pane as Relative Vigor Index"),
    read: "This row draws the RVI. A separate 'Relative Volatility & Gain Index' is not built.",
  }),
  "Choppiness Index": rec({
    what: "Choppiness Index (14)",
    q: "Over 14 bars, has price travelled far net, or back and forth inside a range?",
    src: "ohlc", win: 14, appears: `${OWN_PANE("A line from 0 to 100")} Guides at 38.2 and 61.8.`,
    read: "Sum of true ranges ÷ (14-bar high − low), on a log scale to 0–100. High values: lots of travel for little net range.",
  }),

  // ── Patterns (marks on the candles) ─────────────────────────
  "Doji Detector": rec({
    what: "Bars whose body is under 10% of their range",
    q: "Which bars closed almost where they opened?",
    src: "oc", win: 1, appears: "A small gold 'D' circle above each matching bar.",
    read: "A doji is a shape: open and close nearly equal. It records indecision in that bar's prices, nothing more.",
  }),
  "Engulfing Pattern": rec({
    what: "Bars whose body covers the previous opposite-colour bar's body",
    q: "Which bars' bodies swallowed the previous bar's body, in the other direction?",
    src: "oc", win: 2, appears: "An 'E' arrow: up below the bar (bullish shape), down above it (bearish shape).",
    read: "Bullish shape: an up bar opening below the prior down bar's close and closing above its open. It is a shape; what follows is not implied.",
  }),
  "Hammer / Shooting Star": rec({
    what: "Bars with one wick over twice the body and the other wick under half the body",
    q: "Which bars have one long wick and almost none on the other side?",
    src: "ohlc", win: 1, appears: "'H' arrow below (long lower wick) or 'S' arrow above (long upper wick).",
    read: "The test is the wick-to-body ratio only; the bar's place in a trend is not checked.",
  }),
  "Morning / Evening Star": rec({
    what: "Three-bar shape: a big bar, a small-bodied bar, then a bar closing past the first bar's middle",
    q: "Where did a large bar, a small bar and an opposite bar print in sequence?",
    src: "oc", win: 3, appears: "'MS' arrow below or 'ES' arrow above the third bar.",
    read: "Morning star: a down bar, a bar with a body under 35% of the first bar's range, then an up bar closing above the first bar's midpoint. A shape, not an outcome.",
  }),
  "Three White Soldiers": rec({
    what: "Three up bars, each opening inside the prior body and closing higher, near their highs",
    q: "Where did three strong up-closing bars print in a row?",
    src: "ohlc", win: 3, appears: "A '3WS' arrow below the third bar.",
    read: "Each of the last two bars closes in the top 35% of its range. A description of three bars.",
  }),
  "Three Black Crows": rec({
    what: "Three down bars, each opening inside the prior body and closing lower, near their lows",
    q: "Where did three strong down-closing bars print in a row?",
    src: "ohlc", win: 3, appears: "A '3BC' arrow above the third bar.",
    read: "Each of the last two bars closes in the bottom 35% of its range. A description of three bars.",
  }),
  "Pin Bar": rec({
    what: "Bars with one wick over 2.5× the body and over 2× the other wick",
    q: "Which bars have one dominant wick?",
    src: "ohlc", win: 1, appears: "A 'P' arrow below (long lower wick) or above (long upper wick).",
    read: "A long wick shows price traded there and closed away from it during the bar. It is a shape only.",
  }),
  "Inside Bar": rec({
    what: "Bars whose high and low sit inside the previous bar's",
    q: "Which bars stayed inside the previous bar's range?",
    src: "hl", win: 2, appears: "A small gold 'IB' circle above the bar.",
    read: "The range contracted for that bar. Nothing about the next bar is implied.",
  }),

  // ── Statistics ──────────────────────────────────────────────
  "Z-Score": rec({
    what: "(close − 20-bar average) ÷ 20-bar standard deviation",
    q: "How many standard deviations is the close from its 20-bar average?",
    src: "close", win: 20, appears: `${OWN_PANE("A line")} Guides at −2, 0 and +2.`,
    read: "+2: the close is two standard deviations above the 20-bar average. A distance, not a cue.",
  }),
  "Percentile Rank": rec({
    what: "Share of the last 100 closes at or below the current close",
    q: "How high is this close compared with the last 100?",
    src: "close", win: 100, appears: OWN_PANE("A line from 0 to 100"),
    read: "90 means 90 of the last 100 closes were at or below this one.",
  }),
  "Linear Regression Slope": rec({
    what: "Slope of the 14-bar least-squares line through the closes",
    q: "Which way, and how steeply, does the best-fit line of the last 14 closes point?",
    src: "close", win: 14, appears: `${OWN_PANE("A line in price units per bar")} Guide at 0.`,
    read: "Positive: the fitted line rises. The value is price change per bar along the fit.",
  }),

  // ── Sessions ────────────────────────────────────────────────
  "Opening Range Breakout": rec({
    what: "High and low of the first 30 minutes after the 9:30 New York open",
    q: "What range did the first 30 minutes of the New York session trade?",
    src: "hl", win: null,
    appears: "Two dashed gold lines, drawn on the bars after 10:00 New York time each day.",
    read: "The lines are that day's 9:30–10:00 ET high and low. On markets that do not open at 9:30 ET, they still use that window. The name says 'breakout'; nothing is detected — the lines are drawn and price is left to the reader.",
  }),
  "Prior Day High/Low": rec({
    what: "The previous New York calendar day's high and low",
    q: "Where were yesterday's high and low?",
    src: "hl", win: null,
    appears: "Two dotted lines (red high, green low) on each day's bars.",
    read: "Days are New York calendar dates. The first loaded day has no prior day, so it draws nothing.",
  }),
};

/** Lookup used by `educationFor` for ids of the form `IND:<name>`. */
export function indicatorEducationFor(id: string): IndicatorEducation | null {
  if (!id.startsWith("IND:")) return null;
  return INDICATOR_EDUCATION[id.slice(4)] ?? null;
}
