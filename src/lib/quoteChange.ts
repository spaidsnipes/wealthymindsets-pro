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
 *
 * ── 2026-09-15: THE DEFAULTING MOVED TO THE SERVER ────────────────────────
 * Branch 3 below used to carry this comment:
 *
 *   "this is only reached when prevClose was genuinely supplied — never when
 *    it was defaulted to the last price"
 *
 * That sentence was FALSE, and it was false in the one way a comment can do
 * real damage: it described the file it lived in correctly, and the system
 * incorrectly. `/api/yahoo/route.ts` line ~173 does
 *
 *   if (!prevClose || prevClose <= 0) prevClose = price;
 *
 * and then publishes `change: 0, changePct: 0`. By the time this module is
 * called the absence has ALREADY been destroyed — `prevClose` is a positive
 * finite number, branch 3 fires, and the tape renders `+0.00 (+0.00%)` with
 * `chgObserved: true`. The exact fabrication this module exists to prevent,
 * re-entering through the one door it did not watch.
 *
 * The Sentinel agreed: `sessionChangeTruth.test.ts` asserts the tape source
 * contains no `prevClose ?? price`. Literally true, and vacuous — the string
 * moved to the server, where the regex cannot see it.
 *
 * The route is HONEST about this: it ships `ohlcObservation.prevClose: false`
 * on exactly that path. The truth was computed, published, and then ignored.
 *
 * `resolveQuoteDayChange` — a sibling owner for the same question — already
 * enforced both rules needed here. Two owners that disagree are worse than
 * one that is wrong, so the rules below are taken from it verbatim rather
 * than re-derived.
 */

export interface QuoteChangeInput {
  /** Last observed price. */
  readonly price: number;
  readonly prevClose?: number | null;
  readonly change?: number | null;
  readonly changePct?: number | null;
  /**
   * The provider's own statement about whether `prevClose` is a REAL prior
   * close or a compatibility fallback to the current price
   * (`/api/yahoo` → `ohlcObservation.prevClose`).
   *
   * Tri-state ON PURPOSE. `false` means the provider told us outright not to
   * trust it. `undefined` means the provider said nothing — permissive, so
   * endpoints that publish no such flag (/api/alpaca, /api/finnhub, cached
   * bodies, fixtures) keep their existing behaviour and cannot regress. Only
   * an explicit `false` withholds.
   */
  readonly prevCloseObserved?: boolean;
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
  const { price, prevClose, change, changePct, prevCloseObserved } = input;

  if (!num(price) || price <= 0) return NOT_OBSERVED;

  // A provider that disowns its own prevClose ALSO disowns everything it
  // derived from it. `/api/yahoo` does not publish `change` as an independent
  // measurement — line ~176 computes `+(price - prevClose).toFixed(4)` from the
  // very field line ~173 just substituted. So on the fallback path it ships
  // `change: 0, changePct: 0` AND `ohlcObservation.prevClose: false` together.
  //
  // Gating only the prevClose branches (below) would have left branch 1 wide
  // open, and branch 1 is the door the WATCHLIST comes through — `changeFields`
  // forwards `j.change`/`j.changePct` verbatim. The fix would have closed the
  // tape and the scanner while the watchlist kept rendering +0.00% from the
  // identical payload. Refuse the derivation where the derivation was poisoned.
  if (prevCloseObserved === false) return NOT_OBSERVED;

  // 1. Provider stated both directly.
  if (num(change) && num(changePct)) {
    return { observed: true, chg: change, pct: changePct };
  }

  const prevUsable =
    num(prevClose) &&
    prevClose > 0 &&
    // NOTE: `prevCloseObserved === false` is not re-checked here. It returns
    // NOT_OBSERVED above, before branch 1, because the disavowal has to cover
    // the provider's DERIVED change as well as its prevClose. TypeScript
    // narrows the type to `true | undefined` by this point and rejects the
    // duplicate comparison outright — the compiler is enforcing that there is
    // exactly one place this question is asked.
    //
    // A prevClose exactly equal to the price is indistinguishable from the
    // `prevClose = price` fallback — UNLESS the provider affirmed the field.
    //
    // `resolveQuoteDayChange` applies this equality rule unconditionally and
    // justifies it as costless: "a genuinely unchanged price yields change 0,
    // which the display guard withholds anyway." That justification does NOT
    // transfer here. `/scanner` has no such guard; it would render "—" and
    // classify the symbol UNRATED. Refusing a real flat session there is a new
    // defect wearing the fix's clothes.
    //
    // So the rule is gated on the affirmation rather than applied blind:
    //   true      → the provider looked, found a prior close, and it equals
    //               the price. That is a FLAT SESSION, an observation. Honour it.
    //   false     → already refused above.
    //   undefined → nobody said. `price === prevClose` is then genuinely
    //               ambiguous between a flat session and `?? price`, and the
    //               ambiguity is unrecoverable from the payload. Withhold:
    //               a disclosed absence is recoverable, a fabricated flat is not.
    (prevCloseObserved === true || prevClose !== price);

  // 2. Provider stated the absolute change; derive the percentage.
  if (num(change) && prevUsable) {
    return { observed: true, chg: change, pct: (change / prevClose) * 100 };
  }

  // 3. Derive both from a real previous close.
  if (prevUsable) {
    const chg = price - prevClose;
    return { observed: true, chg, pct: (chg / prevClose) * 100 };
  }

  // 4. A percentage alone cannot be turned into an absolute move without a
  //    base, and half a change chip is not worth a fabricated other half.
  return NOT_OBSERVED;
}
