/**
 * Session change resolution — "unchanged" is a claim, not a default.
 *
 * Real defect (2026-09-03), TickerTape.tsx:
 *
 *   coinbase/alpaca/finnhub: { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 }
 *   yahoo:                   const prev = j?.prevClose ?? price;  // chg becomes 0
 *
 * A provider that returned a price but no change field produced a row the tape
 * rendered as LIVE, green, with an up-arrow and "+0.00 (+0.00%)". That is an
 * assertion — this symbol is flat on the session — manufactured from the
 * absence of data. The yahoo path reached the same place by a different route:
 * defaulting prevClose to the last price makes price-minus-prev exactly zero.
 *
 * A price can be observed while its change is not. The two facts are separate
 * and must be reported separately.
 */

export interface QuoteChangeInput {
  /** Last observed price. */
  readonly price: number;
  readonly prevClose?: number | null;
  readonly change?: number | null;
  readonly changePct?: number | null;
}

export type QuoteChange =
  | { readonly observed: true; readonly chg: number; readonly pct: number }
  | { readonly observed: false };

const NOT_OBSERVED: QuoteChange = { observed: false };

function num(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Resolve session change from whatever the provider actually supplied.
 * Returns { observed: false } rather than inventing a flat session.
 */
export function selectQuoteChange(input: QuoteChangeInput): QuoteChange {
  const { price, prevClose, change, changePct } = input;

  if (!num(price) || price <= 0) return NOT_OBSERVED;

  // 1. Provider stated both directly.
  if (num(change) && num(changePct)) {
    return { observed: true, chg: change, pct: changePct };
  }

  const prevUsable = num(prevClose) && prevClose > 0;

  // 2. Provider stated the absolute change; derive the percentage.
  if (num(change) && prevUsable) {
    return { observed: true, chg: change, pct: (change / prevClose) * 100 };
  }

  // 3. Derive both from a real previous close. Note this is only reached when
  //    prevClose was genuinely supplied — never when it was defaulted to the
  //    last price, which would guarantee a zero change.
  if (prevUsable) {
    const chg = price - prevClose;
    return { observed: true, chg, pct: (chg / prevClose) * 100 };
  }

  // 4. A percentage alone cannot be turned into an absolute move without a
  //    base, and half a change chip is not worth a fabricated other half.
  return NOT_OBSERVED;
}
