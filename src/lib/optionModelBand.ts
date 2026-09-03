/**
 * The paper simulator's modelled option band.
 *
 * No option quotes are received on the /paper path: premiums are Black-Scholes
 * values from an assumed volatility, and the tradeable "spread" is a modelling
 * assumption. That assumption was written inline in four places as
 * `Math.max(0.02, mid * 0.03)` — the chain display, the buy, the sell, and the
 * open-position mark — so it could drift apart silently.
 *
 * It lives here once, and every consumer states which side of the band it
 * means. Canon §21: a long position's sell-now reference is the BID, never the
 * mid. Marking an open long to the mid overstates it by the half-spread the
 * trader has not yet paid to get out.
 */

/** Fraction of mid used as the modelled half-spread. */
export const MODEL_SPREAD_PCT = 0.03;
/** Floor so sub-penny premiums still carry a realistic minimum band. */
export const MODEL_SPREAD_FLOOR = 0.02;

export interface ModelBand {
  /** What the trader pays to open a long. */
  readonly ask: number;
  /** What the trader receives to close a long — the sell-now reference. */
  readonly bid: number;
  /** The model's theoretical value. Never a tradeable price. */
  readonly mid: number;
}

/**
 * Build the modelled band around a theoretical premium.
 * Returns null when the premium is not a usable number, so callers cannot
 * price a trade off NaN.
 */
export function modelBand(mid: number): ModelBand | null {
  if (!Number.isFinite(mid) || mid < 0) return null;
  const half = Math.max(MODEL_SPREAD_FLOOR, mid * MODEL_SPREAD_PCT);
  return {
    mid,
    ask: mid + half,
    // A premium can never be worth less than nothing.
    bid: Math.max(0, mid - half),
  };
}

/**
 * Unrealised P&L for a long option position, marked to the BID.
 * `multiplier` is contracts-to-shares (typically 100).
 */
export function longOptionUnrealised(
  mid: number,
  entryPrem: number,
  qty: number,
  multiplier: number,
): number | null {
  const band = modelBand(mid);
  if (!band) return null;
  if (!Number.isFinite(entryPrem) || !Number.isFinite(qty)) return null;
  return (band.bid - entryPrem) * qty * multiplier;
}
