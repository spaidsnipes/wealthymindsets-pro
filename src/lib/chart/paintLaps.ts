/**
 * WHERE THE PAINT TIME GOES (perf pass 2026-10-12). Measured on serving with the 2D context's methods
 * wrapped: on a busy BTC-USD 15s tape the overlay's canvas CALLS cost ~1.4 ms of an ~18 ms paint — the rest
 * is JavaScript computing inside `draw()`. Nothing could say which section. These laps can.
 *
 * `draw()` calls `paintLapBegin()` first, then `paintLap(id)` at each top-level section boundary (`id` =
 * the section's source line, stable within a build). Each lap credits the time since the previous lap to
 * the section that just ran, smoothed across paints. `paintLapReceipt()` names the costliest sections as
 * "line:ms|line:ms…". Cost: one performance.now() per section per paint. Nothing painted depends on it.
 */

const SMOOTH = 0.2;
const smoothed = new Map<number, number>();
let lastAt = 0;
let current = 0;

export function paintLapBegin(nowMs: number = performance.now()): void {
  lastAt = nowMs;
  current = 0;
}

export function paintLap(id: number, nowMs: number = performance.now()): void {
  const dt = nowMs - lastAt;
  lastAt = nowMs;
  const prev = smoothed.get(current);
  smoothed.set(current, prev == null ? dt : prev * (1 - SMOOTH) + dt * SMOOTH);
  current = id;
}

/** The `top` costliest sections, "line:ms" joined by "|" (ms to one decimal). */
export function paintLapReceipt(top = 6): string {
  return [...smoothed.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([id, ms]) => `${id}:${ms.toFixed(1)}`)
    .join("|");
}

/** Test seam. */
export function resetPaintLaps(): void {
  smoothed.clear();
  lastAt = 0;
  current = 0;
}
