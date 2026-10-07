/**
 * BAR DELTA KEEL — Garden 19 §6 / census C-02, PURE.
 *
 * "Who won this bar, and by how much of its sided volume?" told ACROSS the
 * candles: each finished bar that carries signed evidence gets a hairline keel
 * on its close edge. Length ∝ delta ratio (delta ÷ sided volume), side ink by
 * sign. Read left to right, the keels are the temporal story — aggression
 * arriving (keels appear), increasing (they lengthen), fading (they shorten),
 * and FAILURE TO DISPLACE: a strong keel whose bar did not move its way (body
 * against the delta, or under a fifth of an ATR) is drawn HOLLOW. Form, not
 * hue, carries the failure.
 *
 * Evidence ladder (one owner each — this module only reads what they hand it):
 *   TAPE   captured signed prints for the bar (footprintCanon.barTapeDelta)
 *   SIDES  the provider's own bid / ask volume per bar (tastytrade bar sides)
 * Neither → no keel (silence is data). Never an OHLC guess, never on spot FX.
 */

export type KeelBasis = "TAPE" | "SIDES";

export interface KeelInput {
  readonly time: number;
  readonly open: number;
  readonly close: number;
  /** ATR at that bar (NaN while warming up). */
  readonly atr: number;
  readonly buy: number;
  readonly sell: number;
  readonly basis: KeelBasis;
}

export interface Keel {
  readonly time: number;
  /** delta ÷ (buy + sell), −1..1. */
  readonly ratio: number;
  readonly delta: number;
  readonly basis: KeelBasis;
  /** A strong keel whose bar did not move its way. */
  readonly failed: boolean;
  /** Ratio's growth vs the previous keel of the same sign: >0 increasing, <0 fading, null = first / flipped. */
  readonly change: number | null;
}

/** |ratio| below this is a balanced bar — no keel. */
export const KEEL_MIN_RATIO = 0.05;
/** |ratio| at or above this paints a full-length keel. */
export const KEEL_FULL_RATIO = 0.6;
/** A keel this strong that fails to displace is a failure, not noise. */
export const FAIL_MIN_RATIO = 0.2;
/** Displacement under this fraction of ATR is "did not move". */
export const FAIL_MAX_BODY_ATR = 0.2;
export const DELTA_KEEL_BUDGET_MS = 1.5;

export function readKeels(rows: readonly KeelInput[]): Keel[] {
  const out: Keel[] = [];
  let prev: Keel | null = null;
  for (const r of rows) {
    const tot = r.buy + r.sell;
    if (!(tot > 0)) { prev = null; continue; }
    const delta = r.buy - r.sell;
    const ratio = delta / tot;
    if (Math.abs(ratio) < KEEL_MIN_RATIO) { prev = null; continue; }
    const body = r.close - r.open;
    const against = body !== 0 && Math.sign(body) !== Math.sign(delta);
    const stalled = r.atr > 0 && Math.abs(body) < FAIL_MAX_BODY_ATR * r.atr;
    const failed = Math.abs(ratio) >= FAIL_MIN_RATIO && (against || stalled);
    const change = prev && Math.sign(prev.ratio) === Math.sign(ratio) ? Math.abs(ratio) - Math.abs(prev.ratio) : null;
    const k: Keel = { time: r.time, ratio, delta, basis: r.basis, failed, change };
    out.push(k);
    prev = k;
  }
  return out;
}

/** Keel length in px for a body of `bodyW` px. */
export function keelLength(ratio: number, bodyW: number): number {
  if (!(bodyW > 0)) return 0;
  return Math.max(1, Math.min(1, Math.abs(ratio) / KEEL_FULL_RATIO) * bodyW);
}
