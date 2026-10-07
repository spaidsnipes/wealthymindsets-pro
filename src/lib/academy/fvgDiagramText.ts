/**
 * FVG ACADEMY DIAGRAMS — TEXT ALTERNATIVES (Garden 19 accessibility pass).
 *
 * Every schematic says in words what it draws, so a screen reader (and a
 * trader who cannot tell the inks apart) gets the same lesson. Bullish and
 * bearish are always named in words, never by colour alone.
 */
import type { FvgDiagramKind } from "./fvgCourse";

export const FVG_DIAGRAM_TEXT: Readonly<Record<FvgDiagramKind, string>> = {
  imbalance: "Three candles rise fast; the hatched range between them is where price crossed quickly and one side barely traded.",
  "three-candle": "Three closed bars named b1, b2 and b3 rising. The gap is created at b3's close; compare b1's wick with b3's wick; b2 is the displacement bar.",
  bullish: "Bullish gap: three bars rise; the low of b3 sits above the high of b1, and the hatched territory between them lies below the move.",
  bearish: "Bearish gap: three bars fall; the high of b3 sits below the low of b1, and the hatched territory between them lies above the move.",
  displacement: "The middle bar b2 is the displacement; the gap's height must be at least the floor of one tick or a tenth of ATR 14, whichever is larger.",
  touch: "After a rising gap, three later bars come back down; the third bar's wick reaches the gap's near edge — that is the first touch, no close needed.",
  partial: "A later wick reaches into the territory but less than half way — a partial mitigation.",
  full: "A later wick reaches the far boundary, the high of b1 — a full mitigation.",
  "rejection-acceptance": "Left: price enters the territory and closes back outside on the origin side — rejection. Right: two or more consecutive closes inside the territory — acceptance.",
  time: "A time axis from the gap's creation to its first touch, counted in bars.",
  structure: "A swing high, the rising leg that broke it, and the gap sitting inside that leg.",
  profile: "A volume-by-price profile beside the chart shows thin rows across the gap's territory.",
  evidence: "A table of senses: price geometry is full from OHLC; order flow and derivatives are only by reference to their own owners.",
  "trade-through": "A bar closes beyond the far boundary — the gap is traded through, which invalidates it.",
  memory: "Several old gaps fade into memory; each territory keeps its own history.",
  statistics: "Descriptive: X of N, in this sample, always showing N. Predictive only if the future resembles the sample by instrument, timeframe, session, regime and N.",
  risk: "Context is not permission: an entry, with an invalidation written before the entry.",
  patience: "Wait for the plan's conditions — with an end time.",
  management: "Entry, stop, target and a time limit drawn as lines: the plan decides, never just holding.",
  psychology: "Evidence first — closes, sides, sample size — and only then, maybe, a label; prints, never intent.",
  edge: "Your journal and your markets, step by step — not a course's claim.",
};

/** The full text alternative for one diagram. */
export function fvgDiagramAlt(kind: FvgDiagramKind, title: string): string {
  return `Schematic: ${title}. ${FVG_DIAGRAM_TEXT[kind]} A drawing, not market data.`;
}
