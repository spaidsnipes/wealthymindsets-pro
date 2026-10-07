/**
 * PROFILE × CANDLE — census #14 (Garden 19 §8), PURE.
 *
 * Selecting a profile row (a Living Profile bucket) lights the bars that built
 * it. Nothing new is measured: the row's own grid (bucket LOW edge + the
 * profile's bucket step) is intersected with what each bar already holds —
 *   TAPE       the bar's captured prints by price (the same tape the profile
 *              was built from): the bar's volume inside the bucket
 *   ESTIMATED  a candle-estimated profile spreads each bar's volume evenly
 *              over its range; the bar's share is its overlap with the bucket
 * A bar with nothing in the bucket is not lit. Selection-only: at rest this
 * paints nothing.
 */

export interface ContributionBar {
  readonly time: number;
  readonly low: number;
  readonly high: number;
  readonly volume: number;
  /** price → { bid, ask } prints heard for this bar, or null when none. */
  readonly tape: ReadonlyMap<number, { readonly bid: number; readonly ask: number }> | null;
}

export interface Contribution {
  readonly time: number;
  /** Volume this bar put into the bucket. */
  readonly volume: number;
  /** volume ÷ the largest contributor's volume, (0,1]. */
  readonly share: number;
}

/** The bucket step: the smallest positive gap between the profile's bucket edges. */
export function bucketStep(prices: readonly number[]): number | null {
  const s = [...new Set(prices.filter(Number.isFinite))].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < s.length; i++) { const d = s[i] - s[i - 1]; if (d > 1e-12 && d < step) step = d; }
  return Number.isFinite(step) ? step : null;
}

export function profileContribution(
  bucketLow: number,
  step: number,
  bars: readonly ContributionBar[],
  basis: "TAPE" | "ESTIMATED",
): Contribution[] {
  if (!(step > 0) || !Number.isFinite(bucketLow)) return [];
  const hi = bucketLow + step;
  const raw: { time: number; volume: number }[] = [];
  for (const b of bars) {
    let v = 0;
    if (basis === "TAPE") {
      if (!b.tape) continue;
      for (const [px, s] of b.tape) if (px >= bucketLow - 1e-9 && px < hi - 1e-9) v += (s.bid > 0 ? s.bid : 0) + (s.ask > 0 ? s.ask : 0);
    } else {
      const range = b.high - b.low;
      if (!(b.volume > 0)) continue;
      if (range <= 0) { if (b.low >= bucketLow && b.low < hi) v = b.volume; }
      else { const ov = Math.min(hi, b.high) - Math.max(bucketLow, b.low); if (ov > 0) v = b.volume * (ov / range); }
    }
    if (v > 0) raw.push({ time: b.time, volume: v });
  }
  const peak = raw.reduce((m, r) => Math.max(m, r.volume), 0);
  return raw.map(r => ({ ...r, share: peak > 0 ? r.volume / peak : 0 }));
}
