/**
 * LIVING PROFILE · BIOGRAPHY — the auction's session lineage, for Inspect.
 *
 * GP12 / H-601: "Living Profile must visibly behave like an auction movie.
 * POC migrates. Value expands. Value contracts. Value translates … Its
 * biography / session lineage belongs in Inspect." The glass draws the movie
 * (the developing-value ribbon and POC trail); this reads the SAME owner's
 * points (selectValueMigration) for the current session and states, in words
 * and prices only, what the auction did: where it started, every time the POC
 * moved, and whether value widened, narrowed or drifted. No forecast, no score.
 *
 * PURE. DETERMINISTIC.
 */

import type { ValueMigrationVM } from "./selectValueMigration";

export interface LivingBiographyVM {
  readonly sessionStart: number;
  readonly bars: number;
  readonly firstPoc: number;
  readonly currentPoc: number;
  /** Every POC change, oldest first (the first entry is the opening POC). */
  readonly pocPath: readonly { readonly time: number; readonly poc: number }[];
  readonly migrations: number;
  readonly valueWidthFirst: number;
  readonly valueWidthNow: number;
  readonly width: "EXPANDED" | "CONTRACTED" | "HELD";
  readonly midpointShift: number;
  readonly drift: "TRANSLATED UP" | "TRANSLATED DOWN" | "HELD";
  readonly quality: "candle-estimated";
}

export function selectLivingBiography(vm: ValueMigrationVM | null | undefined): LivingBiographyVM | null {
  if (!vm || !vm.drawn || vm.points.length === 0) return null;
  const cur = vm.points[vm.points.length - 1].session;
  const pts = vm.points.filter(p => p.session === cur);
  if (pts.length === 0) return null;
  const first = pts[0], last = pts[pts.length - 1];
  const pocPath: { time: number; poc: number }[] = [];
  for (const p of pts) if (!pocPath.length || pocPath[pocPath.length - 1].poc !== p.poc) pocPath.push({ time: p.time, poc: p.poc });
  const w0 = first.vah - first.val, w1 = last.vah - last.val;
  // "Held" within 5% of the opening width — the owner's buckets are coarse.
  const width = w1 > w0 * 1.05 ? "EXPANDED" : w1 < w0 * 0.95 ? "CONTRACTED" : "HELD";
  const shift = (last.vah + last.val) / 2 - (first.vah + first.val) / 2;
  const tol = Math.max(w0, w1) * 0.1;
  const drift = shift > tol ? "TRANSLATED UP" : shift < -tol ? "TRANSLATED DOWN" : "HELD";
  return {
    sessionStart: first.time,
    bars: pts.length,
    firstPoc: first.poc,
    currentPoc: last.poc,
    pocPath,
    migrations: pocPath.length - 1,
    valueWidthFirst: w0,
    valueWidthNow: w1,
    width,
    midpointShift: shift,
    drift,
    quality: vm.quality,
  };
}
