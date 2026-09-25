/**
 * NEAR CANDLE ANATOMY — canon plate H-501 (WM_A_H501_SEMANTIC_ZOOM), right
 * panel: "CANDLE ANATOMY". At NEAR the live candle names its own parts.
 *
 * Each word is a statement about PRICES, so it is decided on prices, never on
 * pixels. A pixel test calls an open of 245.10 and a close of 245.30 "OPEN =
 * CLOSE" whenever the scale squeezes them into 3px — a false price statement
 * that also hides which edge is which. And a wick is the part of the range
 * outside the body: a bar that closes on its high HAS no upper wick, so that
 * high is "HIGH", not "HIGH (WICK)".
 *
 * Crowding is the painter's problem (it fans close words apart on a fixed
 * pitch); it never merges two words the prices keep separate.
 *
 * PURE. DETERMINISTIC.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/**
 * The chart's own bar, narrowed to the four prices the words are decided on —
 * a projection of the shared shape, never a private bar of this file's own.
 */
export type AnatomyBar = Pick<LegacyOhlcvTuple, "open" | "high" | "low" | "close">;

export type AnatomyWord = "HIGH (WICK)" | "HIGH" | "OPEN" | "CLOSE" | "OPEN = CLOSE" | "LOW (WICK)" | "LOW";

export interface AnatomyPart {
  readonly price: number;
  readonly word: AnatomyWord;
}

/** The live candle's parts, top of range first. Empty when any price is unreadable. */
export function nearCandleAnatomyParts(bar: AnatomyBar | null | undefined): AnatomyPart[] {
  if (!bar) return [];
  const { open, high, low, close } = bar;
  if (![open, high, low, close].every(Number.isFinite)) return [];
  const bodyTop = Math.max(open, close), bodyBot = Math.min(open, close);
  const parts: AnatomyPart[] = [{ price: high, word: high > bodyTop ? "HIGH (WICK)" : "HIGH" }];
  if (open === close) parts.push({ price: close, word: "OPEN = CLOSE" });
  else if (open > close) parts.push({ price: open, word: "OPEN" }, { price: close, word: "CLOSE" });
  else parts.push({ price: close, word: "CLOSE" }, { price: open, word: "OPEN" });
  parts.push({ price: low, word: low < bodyBot ? "LOW (WICK)" : "LOW" });
  return parts;
}
