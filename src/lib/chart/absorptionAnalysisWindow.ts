/** UI-06's bounded analysis follows the visible admitted history, not live bars. */
export function absorptionAnalysisWindow(
  count: number,
  visible: { from: number; to: number } | null,
): { from: number; to: number; windowCapped: boolean } {
  let from = 0;
  let to = count;
  if (visible) {
    const lo = Math.floor(visible.from);
    const hi = Math.ceil(visible.to) + 1;
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) {
      from = Math.max(0, Math.min(count, lo));
      to = Math.max(from, Math.min(count, hi));
    }
  }
  const windowCapped = to - from > 30;
  return { from: Math.max(from, to - 30), to, windowCapped };
}
