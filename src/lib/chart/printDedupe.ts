/**
 * THE PRINT DEDUPE WINDOW MUST OUTLIVE THE TAPE IT GUARDS (perf + truth P0, 2026-10-25).
 *
 * MainChart folds the hook's `recentTicks` into the ladder and the Big Trades accumulator on EVERY
 * flush, and skips prints it has already folded by their dedupe key. That key set was capped at
 * 8,000 and trimmed to the newest 4,000 — sized when the tape held 2,000 prints. On 2026-10-23 the
 * tape retention went to 8,000 (RECENT_TICK_RETENTION). From then on, once a session had heard
 * ~4,000 prints, every flush found the older half of the tape "new" again, folded it AGAIN, overflowed
 * the set, trimmed away the newer half, and next flush folded THAT half again — thousands of duplicate
 * prints per frame. Measured on a local production build (BTC 15s, every invention on, 40 prints/s):
 * minute 1 = 26 fps / heap 132 MB; minute 2 = 12 fps, frame p95 250 ms, 202 long tasks, heap 720 MB,
 * the session-size sort 97 ms per paint — and every duplicated print was counted again in the
 * footprint and the bubbles (volume that never traded). On a futures open (~100 prints/s) that is
 * about a minute after load: the Founder's "lag … delays" on a chart left open.
 *
 * The window now keeps at least twice the tape's retention and trims only past three times it, so a
 * print still in the tape can never have left the set.
 */
export function printDedupeWindow(retention: number): { readonly keep: number; readonly max: number } {
  const r = Math.max(1, Math.floor(retention));
  return { keep: 2 * r, max: 3 * r };
}

/** Returns `seen`, or — once it outgrows the window — a new set of its newest `keep` keys. */
export function trimPrintDedupe(seen: Set<string>, retention: number): Set<string> {
  const { keep, max } = printDedupeWindow(retention);
  if (seen.size <= max) return seen;
  return new Set([...seen].slice(-keep));
}
