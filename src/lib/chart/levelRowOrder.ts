/**
 * LEVEL WORDS KEEP THE ORDER OF THEIR PRICES (P110 beside serving NQ1! 1m,
 * 2026-10-06 09:13 CDT). A narrow value area (VAL 31545.00 · POC 31545.00 ·
 * VAH 31548.74, ~4px apart) went through the free-row picker one chip at a
 * time and came out stacked VAL / VAH / POC top to bottom — the lowest price
 * printed highest. The words may step off their rows to stay legible; they
 * may never swap order.
 *
 * `rowsInPriceOrder` takes each level's screen y (smaller y = higher price)
 * and returns label rows at least `gap` apart in the SAME order, anchored on
 * `anchorKey` (the POC keeps its own row; levels above it step up, levels
 * below it step down). Keys absent from the input are ignored. PURE.
 */
export function rowsInPriceOrder<K extends string>(
  levels: readonly { readonly key: K; readonly y: number }[],
  gap: number,
  anchorKey?: K,
): Map<K, number> {
  const out = new Map<K, number>();
  const ok = levels.filter(l => Number.isFinite(l.y)).slice().sort((a, b) => a.y - b.y);
  if (ok.length === 0) return out;
  let ai = anchorKey != null ? ok.findIndex(l => l.key === anchorKey) : -1;
  if (ai < 0) ai = 0;
  const ys = ok.map(l => l.y);
  for (let i = ai + 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap);
  for (let i = ai - 1; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap);
  ok.forEach((l, i) => out.set(l.key, ys[i]));
  return out;
}
