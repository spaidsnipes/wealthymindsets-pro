/**
 * THE PRINTS A FLUSH ADDED — not the whole tape again (perf 2026-10-25 night, the Founder's 1m lag).
 *
 * The socket hook publishes its tape ring (newest batch first, up to 8,000 prints) once per animation
 * frame: `retainRecentTicks` puts the frame's prints IN FRONT of the previous ring, and a history seed
 * (`seedRecentTicks`) appends older prints BEHIND it. The chart's fold walked all 8,000 every frame —
 * building a dedupe key string per print to learn that 7,990 of them were already folded: measured
 * ~60 ms of main thread per second on BTC 1m at 40 prints/s (the fold is idempotent, so nothing was
 * wrong, only slow).
 *
 * This answers which prints of `next` the previous ring `prev` did not hold, by identity: the run in
 * front of prev's head and the run behind prev's tail. When the two rings are not the same ring grown
 * (a new symbol, a reset, a burst bigger than the ring) it says FULL and the caller walks everything,
 * exactly as before. PURE.
 */
export type TapeDelta<T> =
  | { readonly full: true }
  | { readonly full: false; readonly fresh: readonly T[] };

/** Which prints of `next` the previous ring `prev` did not hold (or FULL: walk them all). */
export function tapeDelta<T>(prev: readonly T[] | null | undefined, next: readonly T[]): TapeDelta<T> {
  if (!prev || prev.length === 0) return { full: true };
  if (prev === next) return { full: false, fresh: [] };
  const head = prev[0];
  const k = next.indexOf(head);
  if (k < 0) return { full: true };
  // The overlap must be prev itself, in order: spot-check its far end (where truncation may cut it).
  const overlap = Math.min(prev.length, next.length - k);
  if (overlap <= 0 || next[k + overlap - 1] !== prev[overlap - 1]) return { full: true };
  const front = next.slice(0, k);
  // Prints behind prev's tail (a history seed) — only when prev survived whole.
  const back = overlap === prev.length && next.length > k + prev.length ? next.slice(k + prev.length) : [];
  return { full: false, fresh: back.length ? front.concat(back) : front };
}
