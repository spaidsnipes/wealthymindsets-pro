/**
 * THE BAR SLOT A MOMENT BELONGS TO. A chart can place only its own bar times;
 * an event stamped inside a bar (a book change, a print, a pool phase) has no
 * coordinate of its own and was dropped (serving MNQ 1m, 2026-10-01: Liquidity
 * Lifecycle ON, six pools, 0/6 painted). It belongs to the newest bar that
 * opened at or before it. Before the first bar it has no slot (null).
 * Accepts seconds or milliseconds (a millisecond stamp is read as seconds).
 */
export function barSlotAt(times: readonly number[], t: number): number | null {
  if (!Number.isFinite(t) || times.length === 0) return null;
  const s = t > 1e12 ? t / 1000 : t;
  if (s < times[0]) return null;
  let lo = 0, hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (times[mid] <= s) lo = mid; else hi = mid - 1;
  }
  return times[lo];
}
