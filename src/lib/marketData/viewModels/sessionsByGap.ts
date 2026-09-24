/**
 * ONE SESSION SPLITTER for the profile family.
 *
 * Developing value, Profile Memory and the Composite all need to know where
 * one auction ends and the next begins, and three modules each deciding that
 * would eventually disagree about which session a bar belongs to. This is the
 * one rule: a gap longer than SESSION_GAP_FACTOR × the median bar interval
 * starts a new session. On a 24/7 feed there is no such gap, so the whole
 * window is one session — stated by the count, never faked with a clock cut.
 *
 * Input must be sorted by time. PURE. DETERMINISTIC.
 */

export const SESSION_GAP_FACTOR = 3;

export function medianInterval(times: readonly number[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = times[i] - times[i - 1];
    if (g > 0) gaps.push(g);
  }
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Session index per bar, 0-based, for time-sorted bars. */
export function sessionsByGap(times: readonly number[]): number[] {
  const step = medianInterval(times);
  const breakAfter = step > 0 ? step * SESSION_GAP_FACTOR : Infinity;
  const out: number[] = [];
  let s = 0;
  for (let i = 0; i < times.length; i++) {
    if (i > 0 && times[i] - times[i - 1] > breakAfter) s++;
    out.push(s);
  }
  return out;
}
