/**
 * MEMORY GHOST — H-201. The market has made this shape before; show where.
 *
 * Child: MEMORY GHOST (prior analogue on the SAME axes). Parent: F03 Market
 * Memory. Class: LENS. Manifestation Map: "prior analogue ghosted on the SAME
 * axes behind live price. Opacity target ≤ 0.18. Analogue sample / mismatch
 * belongs in Inspect. NOT a Memory Room, a second past, a cartoon face.
 * Insufficient analogue = Evidence Debt / silence."
 *
 * ── WHAT IS DRAWN, AND WHAT IS REFUSED ─────────────────────────────────────
 *
 * The newest WINDOW bars are the question. Every earlier, non-overlapping
 * window of the same length in the loaded bars is a candidate. Each path is
 * expressed as % change from its own first close; the candidate with the
 * highest correlation to the live path (ties → lower RMSE) is the analogue.
 *
 * The ghost is the analogue's path RE-BASED onto the live window's first close
 * and laid under the SAME live bars it matched. It is a comparison, not a
 * forecast: nothing is drawn to the right of the newest bar, because what the
 * analogue did next is not what this market will do next. No lookahead — only
 * bars strictly before the live window can be an analogue.
 *
 * Weak fit (correlation < MIN_FIT) or too little history publishes a reason
 * and draws nothing. Fit and mismatch are published as numbers, never a score.
 *
 * PURE. DETERMINISTIC.
 */

export const MEMORY_GHOST_VERSION = 1;
export const GHOST_WINDOW = 20;
export const MIN_FIT = 0.8;
/** The Manifestation Map's opacity ceiling for the ghost. */
export const GHOST_MAX_OPACITY = 0.18;

export interface GhostBar {
  readonly time: number;
  readonly close: number;
}

export interface MemoryGhostVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: "DRAWN" | "INSUFFICIENT_HISTORY" | "NO_ANALOGUE";
  /** Ghost points on the live bars' times, re-based to the live window. */
  readonly points: readonly { readonly time: number; readonly price: number }[];
  /** Where the analogue lived (unix seconds of its first and last bar). */
  readonly analogueStart: number | null;
  readonly analogueEnd: number | null;
  /** Pearson correlation of the two % paths. */
  readonly fit: number | null;
  /** RMSE between the two % paths, in percentage points. */
  readonly mismatchPct: number | null;
  /** How many candidate windows were compared. */
  readonly candidates: number;
  readonly opacity: number;
}

const path = (xs: readonly GhostBar[]) => xs.map(b => (b.close / xs[0].close - 1) * 100);

function corr(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

const rmse = (a: readonly number[], b: readonly number[]) =>
  Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0) / a.length);

export function selectMemoryGhost(
  input: readonly GhostBar[] | null | undefined,
  window = GHOST_WINDOW,
): MemoryGhostVM {
  const bars = (input ?? []).filter(b => Number.isFinite(b.time) && Number.isFinite(b.close) && b.close > 0);
  const base = { version: MEMORY_GHOST_VERSION, opacity: GHOST_MAX_OPACITY };
  const none = (reason: MemoryGhostVM["reason"], candidates = 0): MemoryGhostVM => ({
    ...base, drawn: false, reason, points: [], analogueStart: null, analogueEnd: null,
    fit: null, mismatchPct: null, candidates,
  });
  if (bars.length < window * 3) return none("INSUFFICIENT_HISTORY");

  const live = bars.slice(-window);
  const livePath = path(live);
  const lastStart = bars.length - 2 * window; // candidate must END before the live window starts
  let best: { i: number; fit: number; err: number } | null = null;
  let candidates = 0;
  for (let i = 0; i <= lastStart; i++) {
    const cand = bars.slice(i, i + window);
    const cp = path(cand);
    const f = corr(livePath, cp);
    const e = rmse(livePath, cp);
    candidates++;
    if (!best || f > best.fit + 1e-12 || (Math.abs(f - best.fit) <= 1e-12 && e < best.err)) best = { i, fit: f, err: e };
  }
  if (!best || best.fit < MIN_FIT) return none("NO_ANALOGUE", candidates);

  const analogue = bars.slice(best.i, best.i + window);
  const ap = path(analogue);
  const start = live[0].close;
  return {
    ...base,
    drawn: true,
    reason: "DRAWN",
    points: live.map((b, k) => ({ time: b.time, price: start * (1 + ap[k] / 100) })),
    analogueStart: analogue[0].time,
    analogueEnd: analogue[analogue.length - 1].time,
    fit: best.fit,
    mismatchPct: best.err,
    candidates,
  };
}

export default selectMemoryGhost;
