/**
 * UNTRADED OUTLIER BARS ARE WITHHELD, NEVER REPAIRED (Garden 16 §27 — no fake
 * microstructure; found on the glass in the Founder's Chrome, 2026-09-27).
 *
 * TSLA 5m, Yahoo extended hours: two after-hours bars (2026-09-25 20:55Z and
 * 21:00Z) carried VOLUME 0 and a range down to 346.5 against a ~372 market —
 * roughly 25× their neighbours' range. One of them stretched the camera and
 * compiled a "DEMAND 346.53 – 372.25 · DEFENDED" zone that the WAIT plate then
 * pointed at. No trade happened in those bars, so their range is not a price
 * anyone paid.
 *
 * The rule is deliberately narrow (chartBarRangeFact's caution applies: a
 * zero-volume bar that moved is usually a feed that does not report volume):
 *   · only a feed that DOES report volume here — at least MIN_TRADED_BARS of
 *     the window carry a real count (> 1);
 *   · only a bar whose volume is exactly 0;
 *   · only when its range exceeds OUTLIER_RANGE_FACTOR × the median range of
 *     the traded bars around it.
 * Such a bar is WITHHELD (the chart shows a gap, which it names), not clamped
 * or re-drawn — a repaired bar is a lie with a timestamp. The caller publishes
 * what was withheld and why.
 *
 * PURE. DETERMINISTIC.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export const MIN_TRADED_BARS = 20;
export const OUTLIER_RANGE_FACTOR = 6;
const NEIGHBOURS = 20;

/** The chart's own bar shape (M8: no private bar shapes). */
export type OhlcvBar = LegacyOhlcvTuple;

export interface UntradedOutlierResult<T extends OhlcvBar> {
  readonly kept: T[];
  readonly withheld: number[];
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function withholdUntradedOutliers<T extends OhlcvBar>(bars: readonly T[]): UntradedOutlierResult<T> {
  const traded = bars.filter(b => Number.isFinite(b.volume) && b.volume > 1);
  if (traded.length < MIN_TRADED_BARS) return { kept: [...bars], withheld: [] };
  const kept: T[] = [];
  const withheld: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (b.volume !== 0) { kept.push(b); continue; }
    const around: number[] = [];
    for (let d = 1; around.length < NEIGHBOURS && (i - d >= 0 || i + d < bars.length); d++) {
      for (const j of [i - d, i + d]) {
        const n = bars[j];
        if (n && n.volume > 1 && n.high >= n.low) around.push(n.high - n.low);
      }
    }
    const med = median(around);
    const range = b.high - b.low;
    if (med != null && med > 0 && range > OUTLIER_RANGE_FACTOR * med) { withheld.push(b.time); continue; }
    kept.push(b);
  }
  return { kept, withheld };
}
