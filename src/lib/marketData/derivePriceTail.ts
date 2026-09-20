import { deriveLastBarClose, type BarCloseCandidate } from "./deriveLastBarClose";

/**
 * THE MINI BOOK'S EVIDENCE — a tail of provably-closed bar closes.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────
 * The binding FL-04 plate (WM_FL_04_NEWS_CHART_COMPANION) does not show a
 * sentence about price on the News room's companion. It shows a PRICE BOOK:
 * a real line with a labelled price axis (531.00 / 530.00 / 529.00 / 528.00)
 * and a labelled session axis (09:30 … 15:30). The Founder's law for the
 * plate is "the mini book stays pinned with the same Decision_ID."
 *
 * The first implementation of the Companion shipped a CVD sparkline in that
 * slot — a line this codebase already knew how to draw, from data it already
 * had. It was honest about what it was, and it was still the wrong thing:
 * the component library does not define the product ceiling. A price book
 * needs PRICES OVER TIME, and nothing in canonical market state carried
 * more than ONE close (`lastBar`). So the shape had to be built, not
 * substituted.
 *
 * ── WHY IT IS NOT A SECOND OWNER OF "WHICH BAR CLOSED" ────────────────
 * `deriveLastBarClose` already answers the genuinely hard question — which
 * bar has PROVABLY closed — with two independent proofs and a deliberately
 * conservative degradation. Re-deriving that here would make a second owner
 * that agrees until the day one copy is edited. So this module calls it for
 * the TAIL'S ENDPOINT and only answers the new question: which bars lie at
 * or before that endpoint, in order.
 *
 * Every point in the returned tail is therefore a provably closed bar: the
 * endpoint by `deriveLastBarClose`'s own proof, and each earlier bar by
 * PROOF 1 (a strictly newer bar exists — the endpoint, at minimum).
 *
 * ── WHAT IT REFUSES ───────────────────────────────────────────────────
 *   - A FORMING BAR. Its "close" is the seed it was born with; drawing it
 *     as the last point of a price line publishes a close that never
 *     happened, at the exact pixel a reader's eye lands on.
 *   - A SINGLE POINT. One dot is not a book. Two is the minimum that can
 *     honestly be called a line, and the renderer is handed `null` rather
 *     than a one-element array it might interpolate from.
 *   - A CONTRADICTED TIMESTAMP. Two bars claiming the same open with
 *     different closes are a data defect, not a pair. Picking either would
 *     invent an ordering the evidence does not support, so BOTH are
 *     dropped and the rest of the tail still renders.
 *   - INTERPOLATION. Gaps are not filled. A halted or illiquid instrument
 *     genuinely has no bar there, and a straight line drawn across the hole
 *     is a price path that never traded.
 */
export interface PriceTailPoint {
  /** Bar-open epoch in MILLISECONDS — canonical state's unit, never seconds. */
  readonly t: number;
  /** The bar's close. Always finite and > 0. */
  readonly c: number;
}

export interface PriceTailEvidence {
  /** The timeframe every point belongs to. A book without one is not readable. */
  readonly timeframe: string;
  /** Ascending by `t`, at least 2 points, every one provably closed. */
  readonly points: readonly PriceTailPoint[];
}

/**
 * The cap on how much history travels inside a sealed snapshot.
 *
 * Canonical market state is a SNAPSHOT, not a history database — the store's
 * own header says so. 120 closes is roughly one cash session at 1m/5m and
 * comfortably more than a 232px-wide panel can resolve; beyond that every
 * extra point costs a deep-freeze on every publish and buys no pixel.
 *
 * The NEWEST points are the ones kept. A book truncated at the old end still
 * ends at the live edge, which is where the reader's eye goes.
 */
export const PRICE_TAIL_MAX_POINTS = 120;

export function derivePriceTail(
  bars: readonly BarCloseCandidate[] | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): PriceTailEvidence | null {
  const endpoint = deriveLastBarClose(bars, timeframe, nowMs);
  if (endpoint === null || !bars) return null;

  // Keyed by bar-open ms so a repeated timestamp is visible rather than
  // silently appended twice. `null` marks a timestamp already proven
  // contradictory — it can never be revived by a third sighting.
  const byTime = new Map<number, number | null>();
  for (const bar of bars) {
    if (!bar) continue;
    if (!Number.isFinite(bar.close) || bar.close <= 0) continue;
    if (!Number.isFinite(bar.time) || bar.time <= 0) continue;
    const t = Math.round(bar.time * 1000);
    // Nothing past the provably-closed endpoint. This is what keeps a
    // forming bar out of the line.
    if (t > endpoint.barOpenedAtMs) continue;
    if (!byTime.has(t)) {
      byTime.set(t, bar.close);
      continue;
    }
    const held = byTime.get(t);
    if (held !== null && held !== bar.close) byTime.set(t, null);
  }

  const points: PriceTailPoint[] = [];
  for (const [t, c] of byTime) {
    if (c === null) continue;
    points.push({ t, c });
  }
  points.sort((a, b) => a.t - b.t);

  // One dot is not a line. Handing the renderer a single point would invite
  // it to draw a flat segment across the whole width — a claim of stillness
  // the evidence never made.
  if (points.length < 2) return null;

  return {
    timeframe: endpoint.timeframe,
    points:
      points.length > PRICE_TAIL_MAX_POINTS
        ? points.slice(points.length - PRICE_TAIL_MAX_POINTS)
        : points,
  };
}

export default derivePriceTail;
