/**
 * THE FUTURES-OPTION TICKET'S ARITHMETIC — Garden 18 §LXI/§LXIV ("correct
 * futures economics, no equity-option assumptions").
 *
 * Single-leg only. Every number derives from the contract's own multiplier
 * ($ per point, from tastytrade's notional-value ÷ display-factor), the limit,
 * the strike and the live Greeks — nothing assumed, and a missing input yields
 * null rather than a guess. PURE.
 */

export type FopSide = "BUY" | "SELL";
export type FopRight = "CALL" | "PUT";

export interface FopTicketInput {
  readonly side: FopSide;
  readonly right: FopRight;
  readonly strike: number;
  readonly qty: number;
  readonly limit: number | null;
  readonly multiplier: number | null;
  readonly delta: number | null;
  readonly theta: number | null;
}

export interface FopTicketReading {
  /** Cash: negative = you pay (debit), positive = you receive (credit). */
  readonly cash: number | null;
  /** Worst case at expiry; null = unlimited (or unknown inputs). */
  readonly maxLoss: number | null;
  readonly maxLossUnlimited: boolean;
  readonly maxProfit: number | null;
  readonly maxProfitUnlimited: boolean;
  readonly breakeven: number | null;
  /** Position delta in $ per 1-point move of the parent future. */
  readonly deltaDollarsPerPoint: number | null;
  /** Position theta in $ per day (negative = decay costs you). */
  readonly thetaDollarsPerDay: number | null;
}

const fin = (x: number | null): x is number => x != null && Number.isFinite(x);

export function readFopTicket(t: FopTicketInput): FopTicketReading {
  const sign = t.side === "BUY" ? 1 : -1;
  const m = t.multiplier, q = t.qty, px = t.limit;
  const ok = fin(m) && fin(px) && px > 0 && q > 0;
  const premium = ok ? px! * m! * q : null;
  const breakeven = fin(px) && px > 0 ? (t.right === "CALL" ? t.strike + px : t.strike - px) : null;
  const intrinsicAtZero = fin(m) ? Math.max(0, t.strike) * m * q : null; // a put's value if the future went to 0
  let maxLoss: number | null = null, maxProfit: number | null = null;
  let maxLossUnlimited = false, maxProfitUnlimited = false;
  if (premium != null) {
    if (t.side === "BUY") {
      maxLoss = premium;
      if (t.right === "CALL") maxProfitUnlimited = true;
      else maxProfit = intrinsicAtZero != null ? intrinsicAtZero - premium : null;
    } else {
      maxProfit = premium;
      if (t.right === "CALL") maxLossUnlimited = true;
      else maxLoss = intrinsicAtZero != null ? intrinsicAtZero - premium : null;
    }
  }
  return {
    cash: premium == null ? null : -sign * premium,
    maxLoss, maxLossUnlimited, maxProfit, maxProfitUnlimited, breakeven,
    deltaDollarsPerPoint: fin(t.delta) && fin(m) ? sign * t.delta * m * q : null,
    thetaDollarsPerDay: fin(t.theta) && fin(m) ? sign * t.theta * m * q : null,
  };
}

/**
 * The market's priced one-standard-deviation move to expiry, from the
 * at-the-money IV: price × IV × √(years). The "±" tastytrade shows beside IVx.
 * An estimate from IV, labelled as one; null when an input is missing.
 */
export function expectedMove(price: number | null, iv: number | null, msToExpiry: number | null): number | null {
  if (!fin(price) || !fin(iv) || !fin(msToExpiry) || price <= 0 || iv <= 0 || msToExpiry <= 0) return null;
  return price * iv * Math.sqrt(msToExpiry / (365 * 86_400_000));
}
