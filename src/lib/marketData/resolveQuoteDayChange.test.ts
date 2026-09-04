/**
 * resolveQuoteDayChange — Sentinel for the fabricated-reference-close door.
 *
 * The bug this locks: /api/yahoo falls back to `prevClose = price` when it has
 * no prior close, publishing `change: 0` (and honestly flagging
 * `ohlcObservation.prevClose: false`). The client used to seed `prevCloseRef`
 * with `price - 0`, after which every websocket tick reported a day-change
 * measured from that arbitrary intraday snapshot — a NON-ZERO fabrication that
 * `selectTickerChangeDisplay` cannot catch, because its only "no reference"
 * signature is exactly-zero.
 */

import { describe, it, expect } from "vitest";
import { resolveQuoteDayChange } from "./resolveQuoteDayChange";

describe("resolveQuoteDayChange — reference-close truth gate", () => {
  // ── POSITIVE CONTROL ──────────────────────────────────────────────────────
  // A resolver that withholds everything would make every "no reference"
  // assertion below pass vacuously while destroying the real day-change on the
  // primary trading surface. These two must stay green.
  it("POSITIVE CONTROL: passes a healthy quote through with the provider's own numbers", () => {
    const r = resolveQuoteDayChange(
      {
        prevClose: 376.37,
        change: -22.8,
        changePct: -6.0578,
        ohlcObservation: { prevClose: true },
      },
      353.57,
    );
    expect(r.hasReferenceClose).toBe(true);
    expect(r.referenceClose).toBe(376.37);
    // Byte-identical to what the provider published — this guard must not
    // re-derive and drift the number a trader is reading.
    expect(r.change).toBe(-22.8);
    expect(r.changePct).toBe(-6.0578);
  });

  it("POSITIVE CONTROL: derives change from prevClose when the provider omitted it", () => {
    const r = resolveQuoteDayChange({ prevClose: 100 }, 110);
    expect(r.hasReferenceClose).toBe(true);
    expect(r.change).toBe(10);
    expect(r.changePct).toBe(10);
  });

  // ── The actual defect ─────────────────────────────────────────────────────
  it("withholds when the provider flags prevClose as a fallback (ohlcObservation)", () => {
    // Verbatim shape of /api/yahoo when validCloses/chartPreviousClose/
    // previousClose are all absent: prevClose is set to price, change is 0,
    // and ohlcObservation.prevClose is false.
    const r = resolveQuoteDayChange(
      {
        prevClose: 353.0,
        change: 0,
        changePct: 0,
        ohlcObservation: { prevClose: false },
      },
      353.0,
    );
    expect(r.hasReferenceClose).toBe(false);
    expect(r.referenceClose).toBeNull();
    expect(r.change).toBe(0);
    expect(r.changePct).toBe(0);
  });

  it("withholds when prevClose merely echoes price, even with no observation flag", () => {
    // /api/alpaca does `prevClose = json?.prevDailyBar?.c ?? price` and
    // publishes NO ohlcObservation, so the echo itself has to be the tell.
    const r = resolveQuoteDayChange({ prevClose: 353.0, change: 0, changePct: 0 }, 353.0);
    expect(r.hasReferenceClose).toBe(false);
    expect(r.referenceClose).toBeNull();
  });

  it("never adopts price as its own reference close", () => {
    // The pre-fix expression was `prevClose ?? pc ?? open ?? price`. If `price`
    // is ever reachable as a reference, change is 0 by construction and the
    // caller seeds prevCloseRef with the current price.
    const r = resolveQuoteDayChange({}, 353.0);
    expect(r.hasReferenceClose).toBe(false);
    expect(r.referenceClose).toBeNull();
  });

  it("withholds on an empty / absent payload rather than inventing a flat quote", () => {
    expect(resolveQuoteDayChange(null, 100).hasReferenceClose).toBe(false);
    expect(resolveQuoteDayChange(undefined, 100).hasReferenceClose).toBe(false);
    expect(resolveQuoteDayChange({}, 0).hasReferenceClose).toBe(false);
  });

  it("rejects non-finite and non-positive references", () => {
    expect(resolveQuoteDayChange({ prevClose: NaN }, 100).hasReferenceClose).toBe(false);
    expect(resolveQuoteDayChange({ prevClose: 0 }, 100).hasReferenceClose).toBe(false);
    expect(resolveQuoteDayChange({ prevClose: -5 }, 100).hasReferenceClose).toBe(false);
    expect(resolveQuoteDayChange({ prevClose: "376.37" }, 100).hasReferenceClose).toBe(false);
  });

  // ── Weaker but REAL references stay usable ────────────────────────────────
  it("accepts `pc` (Finnhub's prior-close field)", () => {
    const r = resolveQuoteDayChange({ pc: 100 }, 105);
    expect(r.hasReferenceClose).toBe(true);
    expect(r.referenceClose).toBe(100);
    expect(r.change).toBe(5);
  });

  it("falls back to `open` only when it is a real, distinct observation", () => {
    expect(resolveQuoteDayChange({ open: 100 }, 105).referenceClose).toBe(100);
    // open === price is the same echo-fabrication, one field over.
    expect(resolveQuoteDayChange({ open: 105 }, 105).hasReferenceClose).toBe(false);
  });

  it("infers a reference from a NON-ZERO explicit change when no close is published", () => {
    const r = resolveQuoteDayChange({ change: 5 }, 105);
    expect(r.hasReferenceClose).toBe(true);
    expect(r.referenceClose).toBe(100);
    expect(r.changePct).toBe(5);
  });

  it("does NOT infer a reference from an explicit change of exactly zero", () => {
    // This is the laundering step: 0 is finite, so the old code accepted it and
    // seeded prevCloseRef with the current price.
    const r = resolveQuoteDayChange({ change: 0 }, 105);
    expect(r.hasReferenceClose).toBe(false);
    expect(r.referenceClose).toBeNull();
  });

  it("prefers a real prevClose over an inferred one", () => {
    const r = resolveQuoteDayChange({ prevClose: 100, change: 5 }, 105);
    expect(r.referenceClose).toBe(100);
  });

  it("reports a genuinely flat quote as referenced, not withheld", () => {
    // A real prior close that happens to differ from price by nothing material
    // still HAS a reference. Direction is the display layer's problem.
    const r = resolveQuoteDayChange({ prevClose: 100, change: 0, changePct: 0 }, 100.0001);
    expect(r.hasReferenceClose).toBe(true);
    expect(r.referenceClose).toBe(100);
  });
});
