"use client";

/**
 * canvasClock — a cadence clock for the Market Canvas view-model hook.
 *
 * WHY THIS EXISTS (freshness-truth bug it fixes):
 * `useMarketCanvasVM` feeds `nowMs` into the pure compiler so that
 * permission-rule freshness and evidence age reflect the live clock.
 * But the hook read `Date.now()` at render time and then *excluded* it
 * from its `useMemo` dependency list. React only recomputes a memo when
 * a listed dependency changes, so between market-state updates the
 * compiler kept receiving a STALE `nowMs` frozen at the last dependency
 * change. During a QUIET or DISCONNECTED feed the canonical store stops
 * notifying entirely — no re-render fires — so "age since last update"
 * froze and the data looked fresher than it really was. That is exactly
 * the kind of freshness overclaim the founder truth canon forbids.
 *
 * Merely adding `nowMs` to the deps does NOT fix it: with no re-render
 * during a silent feed there is nothing to trigger recomputation. The
 * real fix is a periodic tick that (a) forces a re-render on a fixed
 * cadence and (b) exposes a value the memo can depend on, so age keeps
 * advancing even when the market itself is silent.
 *
 * DESIGN:
 *  - `quantizeClock` is PURE and unit-tested: it floors a timestamp to a
 *    bucket boundary so the clock advances in discrete, deterministic
 *    steps (avoids a re-render on literally every animation frame).
 *  - `useCanvasClock` is the thin React wrapper. It is SSR-safe: it does
 *    NOT read `Date.now()` during render (which would reintroduce the
 *    hydration-mismatch #418 class the team already fixed). It returns
 *    `null` until mounted, then ticks on a cadence inside an effect.
 */

import * as React from "react";

/**
 * Default cadence for the canvas clock. Five seconds keeps "seconds
 * since last update" visibly advancing during a quiet feed without
 * re-rendering three canvas surfaces on every frame.
 */
export const CANVAS_CLOCK_BUCKET_MS = 5_000;

/**
 * Floor `nowMs` to the nearest `bucketMs` boundary below it. Pure and
 * total: non-finite / non-positive inputs degrade to safe values rather
 * than producing NaN timestamps that would poison downstream age math.
 */
export function quantizeClock(nowMs: number, bucketMs: number): number {
  if (!Number.isFinite(nowMs)) return 0;
  if (!Number.isFinite(bucketMs) || bucketMs <= 0) return nowMs;
  return Math.floor(nowMs / bucketMs) * bucketMs;
}

/**
 * A re-rendering clock that advances on a fixed cadence. Returns `null`
 * before mount (SSR / first client render) so callers can fall back to
 * their existing render-time clock without a hydration mismatch; after
 * mount it returns the quantized live clock and re-renders each time the
 * bucket boundary is crossed.
 */
export function useCanvasClock(bucketMs: number = CANVAS_CLOCK_BUCKET_MS): number | null {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const next = quantizeClock(Date.now(), bucketMs);
        return prev === next ? prev : next;
      });
    tick(); // establish the real clock immediately on mount
    // Poll often enough to notice the boundary crossing promptly, but
    // never faster than once a second.
    const id = setInterval(tick, Math.min(Math.max(bucketMs, 250), 1_000));
    return () => clearInterval(id);
  }, [bucketMs]);
  return now;
}

export default useCanvasClock;
