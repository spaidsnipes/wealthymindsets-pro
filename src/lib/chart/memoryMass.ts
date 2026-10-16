/**
 * CODEX PLATE 14 · Profile Memory's body — a remembered session's candle-estimated profile.
 * Each bar's volume is spread evenly over its own [low, high] (the house's candle estimate, which the
 * S-n chip already says as EST); the result is NORMALISED against the heaviest row, so the painter
 * draws widths from shares and never handles volume.
 */
export interface MemoryMassRow { readonly lo: number; readonly hi: number; readonly share: number }

export function memoryMass(
  bars: readonly { time: number; high: number; low: number; volume?: number }[],
  fromExclusive: number,
  toInclusive: number,
  rows = 48,
): MemoryMassRow[] {
  const sess = bars.filter(b => b.time > fromExclusive && b.time <= toInclusive && Number.isFinite(b.high) && Number.isFinite(b.low) && Number.isFinite(b.volume ?? NaN));
  if (sess.length < 5) return [];
  const lo = Math.min(...sess.map(b => b.low)), hi = Math.max(...sess.map(b => b.high));
  if (!(hi > lo)) return [];
  const step = (hi - lo) / rows;
  const vol = new Array<number>(rows).fill(0);
  for (const b of sess) {
    const i0 = Math.max(0, Math.floor((b.low - lo) / step));
    const i1 = Math.min(rows - 1, Math.floor((b.high - lo) / step));
    const share = (b.volume ?? 0) / (i1 - i0 + 1);
    for (let i = i0; i <= i1; i++) vol[i] += share;
  }
  const vmax = Math.max(...vol);
  if (!(vmax > 0)) return [];
  return vol.map((v, i) => ({ lo: lo + i * step, hi: lo + (i + 1) * step, share: v / vmax })).filter(r => r.share > 0);
}
