/**
 * SHERIFF SWEEP 2026-10-07 — the ticker rail printed prices at a magnitude
 * guess (`> 10k → 0 dp`, `> 1 → 4 dp`): NQ1! 31,385.25 read "31,385" (its
 * quarter tick erased) and CL1! read "88.1600" (two invented zeros), so the
 * rail disagreed with the chart header for the same quote. Every displayed
 * price now reads the ONE display-precision owner, and the session change is
 * printed at the same decimals with thousands separators.
 */
import { displayPrecisionFor } from "@/lib/chart/pricePrecision";

export function tickerDecimals(symbol: string, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 2;
  return displayPrecisionFor(symbol, [{ open: price, high: price, low: price, close: price }]);
}

export function formatTickerPrice(price: number, dp: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** Signed session change at the quote's own decimals: "+2.72", "-2,225.40". */
export function formatTickerChange(chg: number, dp: number): string {
  const body = Math.abs(chg).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return `${chg >= 0 ? "+" : "-"}${body}`;
}
