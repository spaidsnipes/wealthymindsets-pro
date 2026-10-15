/**
 * SHOW ME — the camera reveals what the trader asked for (Garden 19 finish-line order §4,
 * 2026-10-15). An invention that is OFF_CAMERA is named at the pane edge (the edge brick
 * stack, the "▲ CALL WALL …" chips); a tap on that edge marker is an explicit ask, so the
 * price camera extends to the asked level for REVEAL_HOLD_MS and then lets go. The ask
 * outranks the camera's own share rule (a far wall normally stays named, not held) because
 * the trader, not the chart, chose it; it never outranks a later drag or wheel (those clear
 * the reveal through the manual range, as every camera move does).
 *
 * Pure: the chart feeds its robust range in and paints what comes back; the receipt is
 * `data-camera-reveal` on the overlay.
 */

export interface CameraReveal {
  /** The price the camera must include. */
  readonly price: number;
  /** Epoch ms after which the camera lets go. */
  readonly until: number;
  /** What was asked for, for the receipt ("WALL", …). */
  readonly what: string;
}

export const REVEAL_HOLD_MS = 10_000;

export function askReveal(price: number, what: string, now: number, holdMs = REVEAL_HOLD_MS): CameraReveal | null {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(now)) return null;
  return { price, until: now + holdMs, what };
}

export interface RevealedRange {
  readonly lo: number;
  readonly hi: number;
  /** The asked level sits above the candles' range → headroom on top. */
  readonly top: boolean;
  /** … or below → headroom at the bottom. */
  readonly bottom: boolean;
  /** Whether the reveal changed the range at all (already on camera = false). */
  readonly applied: boolean;
}

/** Extend `range` to include a live reveal. Expired or absent reveals leave the range alone. */
export function applyReveal(range: { readonly lo: number; readonly hi: number }, reveal: CameraReveal | null | undefined, now: number): RevealedRange {
  const base = { lo: range.lo, hi: range.hi, top: false, bottom: false, applied: false };
  if (!reveal || !(now < reveal.until) || !(range.hi > range.lo)) return base;
  if (reveal.price > range.hi) return { lo: range.lo, hi: reveal.price, top: true, bottom: false, applied: true };
  if (reveal.price < range.lo) return { lo: reveal.price, hi: range.hi, top: false, bottom: true, applied: true };
  return base;
}

/** The overlay receipt: NONE, or what is being shown and for how much longer. */
export function revealReceipt(reveal: CameraReveal | null | undefined, now: number): string {
  if (!reveal) return "NONE";
  const left = reveal.until - now;
  if (!(left > 0)) return `DONE:${reveal.what}@${reveal.price}`;
  return `REVEAL:${reveal.what}@${reveal.price}:${Math.ceil(left / 1000)}s`;
}
