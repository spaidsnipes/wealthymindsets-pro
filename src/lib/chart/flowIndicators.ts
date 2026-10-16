/**
 * PLATE 29 · NEW ORDER-FLOW INDICATORS (Garden 19 finish line, Founder 2026-10-15).
 * "Real panes with big labels and the current value in the corner."
 *
 * VOLUME PACE — this bar's volume against the median volume of the bars before it ("1.6× normal").
 * Read from the bars alone, so it covers every candle on camera. The median (not the mean) so one
 * spike does not make every bar after it look quiet.
 */

export const VOLUME_PACE_LOOKBACK = 20;

/** volume[i] ÷ median(volume[i−n … i−1]); NaN until n earlier bars exist or when the median is 0. */
export function volumePace(volumes: readonly number[], n: number = VOLUME_PACE_LOOKBACK): number[] {
  const out: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < n) { out.push(NaN); continue; }
    const win = volumes.slice(i - n, i).filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
    if (win.length < n) { out.push(NaN); continue; }
    const med = win.length % 2 ? win[(win.length - 1) / 2] : (win[win.length / 2 - 1] + win[win.length / 2]) / 2;
    const v = volumes[i];
    out.push(med > 0 && Number.isFinite(v) ? v / med : NaN);
  }
  return out;
}

/** "1.6× normal" — one decimal; the word says which side of normal. */
export function volumePaceWords(x: number | null | undefined): string | null {
  if (x == null || !Number.isFinite(x)) return null;
  return `${x.toFixed(1)}× normal`;
}
