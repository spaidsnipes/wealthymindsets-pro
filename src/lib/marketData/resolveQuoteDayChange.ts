/**
 * resolveQuoteDayChange — decide whether a provider quote actually carries a
 * REFERENCE CLOSE, before any day-change number is derived from it.
 *
 * `selectTickerChangeDisplay` is the display guard: it withholds a day-change
 * whose `change` and `changePct` are both exactly 0, because that is the
 * signature `useWebSocket` writes when it has no reference close. That guard is
 * sound but it is the LAST line, and it can only see the two output numbers.
 *
 * This module is the FIRST line, and it exists because the exactly-zero
 * signature was being laundered into a non-zero fabrication:
 *
 *   1. /api/yahoo has no prior close for the symbol, so it falls back to
 *      `prevClose = price` (route line ~176) and therefore publishes
 *      `change: 0, changePct: 0`. It is honest about this — `ohlcObservation
 *      .prevClose` is `false` on exactly that path.
 *   2. The client ignored `ohlcObservation` and read the numbers only.
 *   3. `Number.isFinite(0)` is true, so `prevCloseRef` was seeded with
 *      `price - 0`, i.e. the CURRENT PRICE, as if it were yesterday's close.
 *   4. From then on `flush()` saw a positive `prevCloseRef` and computed
 *      `change = price - <the price at one arbitrary REST poll>` for every
 *      websocket tick.
 *
 * Step 4 is the defect. It emits a NON-ZERO day-change measured from an
 * intraday snapshot, so the display guard waves it through and paints a
 * direction arrow on it. That is a fabricated number on the primary trading
 * surface, and it is the multi-price-disagreement failure (canon Weakness #1)
 * arriving through the one door the existing guard cannot watch.
 *
 * Rules, in order:
 *   - `ohlcObservation.prevClose === false` is the provider stating outright
 *     that its prevClose is a compatibility fallback. Believe it: NO reference.
 *   - A `prevClose` / `pc` exactly equal to `price` is indistinguishable from
 *     that same fabrication, so it is also NO reference. Nothing is lost: a
 *     genuinely unchanged price yields change 0, which the display guard
 *     withholds anyway. This closes the identical `?? price` fallback in
 *     /api/alpaca, which publishes no `ohlcObservation` to check.
 *   - `open` is accepted as a weaker real reference (change-from-open, which is
 *     pre-existing behaviour) but never when it equals `price`.
 *   - A non-zero explicit `change` implies a reference of `price - change`.
 *   - Otherwise there is NO reference, and the output is the exactly-zero
 *     withheld signature that every downstream consumer already understands.
 *
 * PURE — no I/O, no clock, no provider knowledge beyond field names.
 */

export interface RawQuotePayload {
  readonly change?: unknown;
  readonly changePct?: unknown;
  readonly prevClose?: unknown;
  readonly pc?: unknown;
  readonly open?: unknown;
  readonly ohlcObservation?: { readonly prevClose?: unknown } | null;
}

export interface QuoteDayChange {
  /** True only when a REAL reference close backs `change` / `changePct`. */
  readonly hasReferenceClose: boolean;
  /** The resolved reference close, or null when there is none. */
  readonly referenceClose: number | null;
  /** Signed change; exactly 0 when there is no reference (withheld signature). */
  readonly change: number;
  /** Signed percent; exactly 0 when there is no reference. */
  readonly changePct: number;
}

const WITHHELD: QuoteDayChange = {
  hasReferenceClose: false,
  referenceClose: null,
  change: 0,
  changePct: 0,
};

/** Finite number or null — `typeof` alone lets NaN through. */
function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A usable reference close: finite, positive, and not merely the price echoed back. */
function referenceCandidate(value: unknown, price: number): number | null {
  const n = finite(value);
  if (n === null || n <= 0) return null;
  return n === price ? null : n;
}

export function resolveQuoteDayChange(
  payload: RawQuotePayload | null | undefined,
  price: number,
): QuoteDayChange {
  if (!payload || !Number.isFinite(price) || price <= 0) return WITHHELD;

  // The provider told us its prevClose is a fallback, not an observation.
  if (payload.ohlcObservation?.prevClose === false) return WITHHELD;

  const explicitChange = finite(payload.change);

  const referenceClose =
    referenceCandidate(payload.prevClose, price) ??
    referenceCandidate(payload.pc, price) ??
    referenceCandidate(payload.open, price) ??
    (explicitChange !== null && explicitChange !== 0 && price - explicitChange > 0
      ? price - explicitChange
      : null);

  if (referenceClose === null) return WITHHELD;

  // Prefer the provider's own arithmetic when it supplied it, so a healthy
  // quote renders byte-identical numbers to before this guard existed.
  const change = explicitChange ?? +(price - referenceClose).toFixed(4);
  const explicitPct = finite(payload.changePct);
  const changePct =
    explicitPct ?? +(((price - referenceClose) / referenceClose) * 100).toFixed(4);

  return { hasReferenceClose: true, referenceClose, change, changePct };
}
