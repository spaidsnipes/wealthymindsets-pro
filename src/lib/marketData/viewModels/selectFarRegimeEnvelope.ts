/**
 * FAR REGIME ENVELOPE — canon plate H-501 (WM_A_H501_SEMANTIC_ZOOM), left
 * panel: "DIM CANDLES · REGIME ENVELOPE · MAJOR STRUCTURE ONLY".
 *
 * At regime scale the trader weighs direction and width, not candles. The
 * envelope is two least-squares lines in (time, price): one through the
 * MAJOR swing highs in view, one through the major swing lows. Nothing is
 * extrapolated past the last pivot.
 *
 * ONE SWING DETECTOR. The pivots are the Market Structure owner's confirmed
 * pivots (`selectMarketStructure`), never a detector of this file's own. That
 * owner's header states why: re-implementing pivot detection gives "two
 * detectors, two answers, one chart", and the owner already prints the
 * sequence verdict (HH · HL / LL · LH) on the same glass at FAR.
 *
 * "Major" is a filter over the owner's pivots, measured, not chosen: a pivot
 * survives only when price reached the next surviving pivot of the other kind
 * REVERSAL_FRACTION of the visible high–low range away — a zigzag walked over
 * the owner's points, so every major pivot is a pivot the owner confirmed.
 *
 * NO SECOND VERDICT. A label names a pivot's SCALE (MAJOR HIGH / MAJOR LOW),
 * never its SEQUENCE (higher high, lower low): that word is the owner's, and
 * a sequence read over a filtered subset can contradict it on the same swing.
 *
 * PURE. DETERMINISTIC. No copy or sort of the bar history.
 */

import type { StructurePoint } from "./selectMarketStructure";

export const FAR_ENVELOPE_VERSION = 2;
export const FAR_NAMED_PIVOTS = 4;
export const REVERSAL_FRACTION = 0.2;

export interface FarBar { readonly time: number; readonly high: number; readonly low: number }

/** The part of the structure owner's reading this envelope may use. */
export interface FarStructureSource {
  readonly swingHighs: readonly StructurePoint[];
  readonly swingLows: readonly StructurePoint[];
}

export interface FarEnvelopeInput {
  /** The ONE structure owner's reading. Absent → the envelope refuses. */
  readonly structure: FarStructureSource | null | undefined;
  /** Bars in time order. Only those inside the visible range set the scale. */
  readonly bars: readonly FarBar[] | null | undefined;
  readonly visibleFrom: number;
  readonly visibleTo: number;
}

export type FarEnvelopeReason = "DRAWN" | "NO_STRUCTURE" | "TOO_FEW_PIVOTS";
export type PivotWord = "MAJOR HIGH" | "MAJOR LOW";

export interface EnvelopeLine {
  /** price = slope * time + intercept (time in seconds). */
  readonly slope: number;
  readonly intercept: number;
}

export interface FarPivot {
  readonly kind: "HIGH" | "LOW";
  readonly time: number;
  readonly price: number;
}

export interface NamedPivot extends FarPivot {
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

const refuse = (reason: Exclude<FarEnvelopeReason, "DRAWN">): FarEnvelopeVM => ({
  version: FAR_ENVELOPE_VERSION, drawn: false, reason,
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

/**
 * The owner's pivots (time order) that survive a `threshold` zigzag. A running
 * extreme is confirmed only by a later pivot of the other kind at least
 * `threshold` away, so the newest extreme — with nothing after it yet — is
 * never published. Output alternates HIGH / LOW.
 */
export function majorPivots(pivots: readonly FarPivot[], threshold: number): FarPivot[] {
  const out: FarPivot[] = [];
  if (pivots.length < 2 || !(threshold > 0)) return out;
  let dir: 1 | -1 | 0 = 0;
  let hi: FarPivot | null = null, lo: FarPivot | null = null;
  for (const p of pivots) {
    if (dir === 0) {
      if (p.kind === "HIGH" && (!hi || p.price > hi.price)) hi = p;
      if (p.kind === "LOW" && (!lo || p.price < lo.price)) lo = p;
      if (hi && lo && hi.price - lo.price >= threshold) {
        if (hi.time < lo.time) { out.push(hi); dir = -1; }
        else { out.push(lo); dir = 1; }
      }
    } else if (dir === 1) {
      if (p.kind === "HIGH") { if (!hi || p.price > hi.price) hi = p; }
      else if (hi && hi.price - p.price >= threshold) { out.push(hi); dir = -1; lo = p; }
    } else {
      if (p.kind === "LOW") { if (!lo || p.price < lo.price) lo = p; }
      else if (lo && p.price - lo.price >= threshold) { out.push(lo); dir = 1; hi = p; }
    }
  }
  return out;
}

export function selectFarRegimeEnvelope(input: FarEnvelopeInput): FarEnvelopeVM {
  const { structure, bars, visibleFrom, visibleTo } = input;
  if (!structure) return refuse("NO_STRUCTURE");
  const inRange = (t: number) => Number.isFinite(t) && t >= visibleFrom && t <= visibleTo;

  // One pass, no copy: the visible high–low range sets the scale of "major".
  let top = -Infinity, bot = Infinity, n = 0;
  for (const b of bars ?? []) {
    if (!inRange(b.time) || !Number.isFinite(b.high) || !Number.isFinite(b.low)) continue;
    if (b.high > top) top = b.high;
    if (b.low < bot) bot = b.low;
    n++;
  }
  if (n < 3 || !(top > bot)) return refuse("TOO_FEW_PIVOTS");

  const pts: FarPivot[] = [];
  for (const p of structure.swingHighs) if (inRange(p.time) && Number.isFinite(p.price)) pts.push({ kind: "HIGH", time: p.time, price: p.price });
  for (const p of structure.swingLows) if (inRange(p.time) && Number.isFinite(p.price)) pts.push({ kind: "LOW", time: p.time, price: p.price });
  pts.sort((a, b) => a.time - b.time);

  const inView = majorPivots(pts, (top - bot) * REVERSAL_FRACTION);
  const highs = inView.filter(p => p.kind === "HIGH");
  const lows = inView.filter(p => p.kind === "LOW");
  const upper = fit(highs), lower = fit(lows);
  if (!upper || !lower) return refuse("TOO_FEW_PIVOTS");

  const named: NamedPivot[] = inView
    .slice(-FAR_NAMED_PIVOTS)
    .map(p => ({ ...p, word: p.kind === "HIGH" ? "MAJOR HIGH" : "MAJOR LOW" }));

  const lean = upper.slope > 0 && lower.slope > 0 ? "UP" : upper.slope < 0 && lower.slope < 0 ? "DOWN" : "SIDEWAYS";
  return {
    version: FAR_ENVELOPE_VERSION, drawn: true, reason: "DRAWN", upper, lower,
    fromTime: inView[0].time, toTime: inView[inView.length - 1].time, lean,
    named,
  };
}
