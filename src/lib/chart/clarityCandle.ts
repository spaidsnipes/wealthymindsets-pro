/**
 * CLARITY CANDLE — F05A "Clarity is the default language of the room"
 * (WM_NewMockup_72; inspect plate WM_NewMockup_73).
 *
 * A candle species, not a recolour. Each bar is read for three facts from its
 * own OHLC and nothing else:
 *
 *   BODY EFFICIENCY  |close − open| ÷ (high − low). How much of the range the
 *                    market actually decided. Drawn as the body's fill
 *                    strength: a decisive bar is solid gold, indecision is a
 *                    hollow outline. This is the thing a normal candle hides —
 *                    two bars of the same colour and size can mean opposite
 *                    things.
 *   WICK INTENT      the dominant rejection, when one wick is at least twice
 *                    the body and 40% of the range. Drawn as the brighter wick.
 *   TRUTH GAP        a real gap: this bar's range does not touch the previous
 *                    bar's range. Marked with the canon's square at the gap
 *                    edge; FILLED once a later bar trades back through it.
 *
 * Direction stays legible without red/green: a rising body is filled, a
 * falling body is filled from the top and carries the darker ink.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";

/** The canonical bar's own OHLC, keyed by its slot time (seconds). */
export type ClarityBarInput = Readonly<Pick<CanonicalBar, "open" | "high" | "low" | "close">> & { readonly time: number };

export type WickIntent = "UPPER_REJECTION" | "LOWER_REJECTION" | "BALANCED";

export interface ClarityRead {
  readonly time: number;
  /** 0..1, or null for a zero-range bar (nothing was decided or refused). */
  readonly efficiency: number | null;
  readonly wick: WickIntent;
  readonly rising: boolean;
}

export interface TruthGap {
  /** The bar that opened the gap. */
  readonly time: number;
  readonly direction: "UP" | "DOWN";
  /** The untraded band, price low → high. */
  readonly low: number;
  readonly high: number;
  /** Time of the first later bar that traded fully back through it, else null. */
  readonly filledAt: number | null;
}

export function readClarity(b: ClarityBarInput): ClarityRead {
  const range = b.high - b.low;
  const body = Math.abs(b.close - b.open);
  const rising = b.close >= b.open;
  if (!(range > 0)) return { time: b.time, efficiency: null, wick: "BALANCED", rising };
  const upper = b.high - Math.max(b.open, b.close);
  const lower = Math.min(b.open, b.close) - b.low;
  const dominant = (w: number) => w >= 2 * body && w >= 0.4 * range;
  const wick: WickIntent = dominant(upper) && upper > lower ? "UPPER_REJECTION"
    : dominant(lower) && lower > upper ? "LOWER_REJECTION"
    : "BALANCED";
  return { time: b.time, efficiency: Math.min(1, body / range), wick, rising };
}

/** Real gaps in bar order, with whether a later bar has filled each one. */
export function truthGaps(bars: readonly ClarityBarInput[]): TruthGap[] {
  const out: TruthGap[] = [];
  for (let i = 1; i < bars.length; i++) {
    const p = bars[i - 1], b = bars[i];
    let gap: Omit<TruthGap, "filledAt"> | null = null;
    if (b.low > p.high) gap = { time: b.time, direction: "UP", low: p.high, high: b.low };
    else if (b.high < p.low) gap = { time: b.time, direction: "DOWN", low: b.high, high: p.low };
    if (!gap) continue;
    let filledAt: number | null = null;
    for (let j = i + 1; j < bars.length; j++) {
      const c = bars[j];
      if (gap.direction === "UP" ? c.low <= gap.low : c.high >= gap.high) { filledAt = c.time; break; }
    }
    out.push({ ...gap, filledAt });
  }
  return out;
}

/**
 * Body fill alpha from efficiency. Floors at 0.14 so a doji's outline is still
 * a candle (§XXXVI visibility floor); a full-body bar is 0.92, never a flat
 * slab that hides its own edge.
 */
export function clarityBodyAlpha(efficiency: number | null): number {
  if (efficiency == null) return 0.14;
  return 0.14 + 0.78 * Math.max(0, Math.min(1, efficiency));
}

export function wickWords(w: WickIntent): string {
  return w === "UPPER_REJECTION" ? "Upper rejection" : w === "LOWER_REJECTION" ? "Lower rejection" : "Balanced";
}
