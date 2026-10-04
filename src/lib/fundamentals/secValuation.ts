/**
 * Valuation WM can compute from a company's own SEC filings and the price on
 * the chart — no fundamentals key (2026-10-03: the Valuation view read
 * "FUNDAMENTALS PROVIDER — NOT CONFIGURED" while the filings were one call
 * away). Every figure is a WM calculation from named inputs; a figure whose
 * inputs are incomplete is null, never estimated.
 *
 * Trailing twelve months = the four most recent quarters, all four present.
 * P/E is market cap ÷ trailing net income (diluted EPS is not filed for the
 * fourth quarter, so per-share TTM is not built).
 */
import type { SecQuarter } from "./secEdgar";

export interface SecValuation {
  readonly marketCap: number | null;
  readonly ttmRevenue: number | null;
  readonly ttmNetIncome: number | null;
  readonly pe: number | null;
  readonly ps: number | null;
  readonly grossMargin: number | null;
  readonly operatingMargin: number | null;
  readonly netMargin: number | null;
  readonly dividendYield: number | null;
  readonly ttmQuarters: readonly string[];
}

const sum4 = (qs: readonly SecQuarter[], k: "revenue" | "grossProfit" | "operatingIncome" | "netIncome"): number | null => {
  if (qs.length < 4) return null;
  const v = qs.slice(0, 4).map(q => q[k]);
  return v.every((x): x is number => typeof x === "number" && Number.isFinite(x)) ? v.reduce((a, b) => a + b, 0) : null;
};

export function secValuation(
  quarters: readonly SecQuarter[],
  shares: number | null | undefined,
  price: number | null | undefined,
  dividends: readonly { end: string; perShare: number }[] = [],
): SecValuation {
  const qs = [...quarters].sort((a, b) => b.end.localeCompare(a.end));
  const okPrice = typeof price === "number" && price > 0 && Number.isFinite(price);
  const marketCap = okPrice && typeof shares === "number" && shares > 0 ? shares * price : null;
  const rev = sum4(qs, "revenue"), gp = sum4(qs, "grossProfit"), op = sum4(qs, "operatingIncome"), ni = sum4(qs, "netIncome");
  const ratio = (a: number | null, b: number | null) => (a != null && b != null && b !== 0 ? a / b : null);
  const divs = [...dividends].sort((a, b) => b.end.localeCompare(a.end)).slice(0, 4);
  const dividendYield = okPrice && divs.length === 4 ? divs.reduce((a, d) => a + d.perShare, 0) / price : null;
  return {
    marketCap,
    ttmRevenue: rev,
    ttmNetIncome: ni,
    pe: marketCap != null && ni != null && ni > 0 ? marketCap / ni : null,
    ps: ratio(marketCap, rev),
    grossMargin: ratio(gp, rev),
    operatingMargin: ratio(op, rev),
    netMargin: ratio(ni, rev),
    dividendYield,
    ttmQuarters: qs.length >= 4 ? qs.slice(0, 4).map(q => q.end) : [],
  };
}
