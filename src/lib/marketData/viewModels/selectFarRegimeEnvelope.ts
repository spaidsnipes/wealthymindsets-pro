/**
 * FAR REGIME ENVELOPE — canon plate H-501 (WM_A_H501_SEMANTIC_ZOOM), left
 * panel: "DIM CANDLES · REGIME ENVELOPE · MAJOR STRUCTURE ONLY".
 *
 * At regime scale the trader weighs direction and width, not candles. The
 * envelope is two least-squares lines in (time, price): one through the
 * MAJOR swing highs in view, one through the major swing lows. "Major" is
 * measured, not chosen: a zigzag over the visible bars that only turns after
 * price travels REVERSAL_FRACTION of the visible high–low range. Each of the
 * last few pivots is named against the previous pivot of its own kind
 * (HIGHER HIGH, LOWER LOW, …). Nothing is extrapolated past the last pivot.
 */

export const FAR_ENVELOPE_VERSION = 1;
export const FAR_NAMED_PIVOTS = 4;
export const REVERSAL_FRACTION = 0.2;

export interface FarBar { readonly time: number; readonly high: number; readonly low: number }

export type FarEnvelopeReason = "DRAWN" | "TOO_FEW_PIVOTS";
export type PivotWord = "HIGHER HIGH" | "LOWER HIGH" | "EQUAL HIGH" | "HIGHER LOW" | "LOWER LOW" | "EQUAL LOW";

export interface EnvelopeLine {
  /** price = slope * time + intercept (time in seconds). */
  readonly slope: number;
  readonly intercept: number;
}

export interface NamedPivot {
  readonly time: number;
  readonly price: number;
  readonly kind: "HIGH" | "LOW";
  readonly word: PivotWord;
}

export interface FarEnvelopeVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: FarEnvelopeReason;
  readonly upper: EnvelopeLine | null;
  readonly lower: EnvelopeLine | null;
  readonly fromTime: number | null;
  readonly toTime: number | null;
  /** "UP" / "DOWN" when both edges lean the same way, else "SIDEWAYS". */
  readonly lean: "UP" | "DOWN" | "SIDEWAYS";
  readonly named: readonly NamedPivot[];
}

const refuse = (): FarEnvelopeVM => ({
  version: FAR_ENVELOPE_VERSION, drawn: false, reason: "TOO_FEW_PIVOTS",
  upper: null, lower: null, fromTime: null, toTime: null, lean: "SIDEWAYS", named: [],
});

function fit(pts: readonly { time: number; price: number }[]): EnvelopeLine | null {
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.time, 0) / n;
  const my = pts.reduce((s, p) => s + p.price, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of pts) { sxx += (p.time - mx) ** 2; sxy += (p.time - mx) * (p.price - my); }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** Alternating major swing pivots: a turn is confirmed only once price has
 *  travelled `threshold` back from the running extreme. */
export function majorSwings(bars: readonly FarBar[], threshold: number): { kind: "HIGH" | "LOW"; time: number; price: number }[] {
  const out: { kind: "HIGH" | "LOW"; time: number; price: number }[] = [];
  if (bars.length < 3 || !(threshold > 0)) return out;
  let dir: 1 | -1 | 0 = 0;
  let hi = bars[0], lo = bars[0];
  for (const b of bars) {
    if (dir === 0) {
      if (b.high > hi.high) hi = b;
      if (b.low < lo.low) lo = b;
      if (hi.high - lo.low >= threshold) {
        if (hi.time < lo.time) { out.push({ kind: "HIGH", time: hi.time, price: hi.high }); dir = -1; }
        else { out.push({ kind: "LOW", time: lo.time, price: lo.low }); dir = 1; }
      }
    } else if (dir === 1) {
      if (b.high > hi.high) hi = b;
      else if (hi.high - b.low >= threshold) { out.push({ kind: "HIGH", time: hi.time, price: hi.high }); dir = -1; lo = b; }
    } else {
      if (b.low < lo.low) lo = b;
      else if (b.high - lo.low >= threshold) { out.push({ kind: "LOW", time: lo.time, price: lo.low }); dir = 1; hi = b; }
    }
  }
  return out;
}

export function selectFarRegimeEnvelope(
  bars: readonly FarBar[] | null | undefined,
  visibleFrom: number,
  visibleTo: number,
): FarEnvelopeVM {
  const vis = [...(bars ?? [])]
    .filter(b => Number.isFinite(b.time) && Number.isFinite(b.high) && Number.isFinite(b.low) && b.time >= visibleFrom && b.time <= visibleTo)
    .sort((a, b) => a.time - b.time);
  if (vis.length < 3) return refuse();
  let top = -Infinity, bot = Infinity;
  for (const b of vis) { top = Math.max(top, b.high); bot = Math.min(bot, b.low); }
  const inView = majorSwings(vis, (top - bot) * REVERSAL_FRACTION);
  const highs = inView.filter(p => p.kind === "HIGH");
  const lows = inView.filter(p => p.kind === "LOW");
  const upper = fit(highs), lower = fit(lows);
  if (!upper || !lower) return refuse();

  const named: NamedPivot[] = [];
  for (const group of [highs, lows]) {
    for (let i = 1; i < group.length; i++) {
      const p = group[i], prev = group[i - 1];
      const tol = Math.abs(prev.price) * 1e-4;
      const cmp = p.price > prev.price + tol ? "HIGHER" : p.price < prev.price - tol ? "LOWER" : "EQUAL";
      named.push({ time: p.time, price: p.price, kind: p.kind, word: `${cmp} ${p.kind}` as PivotWord });
    }
  }
  named.sort((a, b) => a.time - b.time);

  const lean = upper.slope > 0 && lower.slope > 0 ? "UP" : upper.slope < 0 && lower.slope < 0 ? "DOWN" : "SIDEWAYS";
  return {
    version: FAR_ENVELOPE_VERSION, drawn: true, reason: "DRAWN", upper, lower,
    fromTime: inView[0].time, toTime: inView[inView.length - 1].time, lean,
    named: named.slice(-FAR_NAMED_PIVOTS),
  };
}
