import { describe, it, expect } from "vitest";
import { selectExpressionCard } from "./expressionCard";

/**
 * BUILD ORDER §2/§3 — the ATTACHED EXPRESSION OBJECT, and the canon
 * distinctions it must never blur:
 *   CONTRACT RETURN % != R
 *   CAPITAL DEPLOYED != PLANNED LOSS
 *   MID != guaranteed fill
 *   §21 long option exit reference = BID
 */
const NOW = 1_788_000_000_000;
const base = {
  underlyingSymbol: "TSLA",
  contractLabel: "TSLA 380C 09/12",
  isCall: true,
  strike: 380,
  expiryMs: NOW + 7 * 24 * 60 * 60 * 1000,
  nowMs: NOW,
  qtyRequested: 3,
  qtyFilled: 3,
  entryPremium: 4.00,
  underlyingEntry: 383.0,
  underlyingInvalidation: 378.40,
  iv: 0.5,
};

describe("expression card (§2/§3)", () => {
  it("§21 uses BID as the long sell-now reference and names the role", () => {
    const c = selectExpressionCard({ ...base, bid: 3.60, ask: 3.90 });
    expect(c.currentPremium).toBe(3.60);
    expect(c.currentPremiumRole).toBe("BID");
  });

  it("never presents a modeled premium as if it were a quote", () => {
    const c = selectExpressionCard({ ...base, bid: null, ask: null, modeledPremium: 3.75 });
    expect(c.currentPremium).toBe(3.75);
    expect(c.currentPremiumRole).toBe("MODELED");
  });

  it("reports UNKNOWN role when no price of any kind exists", () => {
    const c = selectExpressionCard({ ...base, bid: null, ask: null, modeledPremium: null });
    expect(c.currentPremium).toBeNull();
    expect(c.currentPremiumRole).toBe("UNKNOWN");
    expect(c.currentR).toBeNull();
    expect(c.contractReturnPct).toBeNull();
  });

  it("CONTRACT RETURN % and R are different numbers, never merged", () => {
    // Debit 3 x 4.00 x 100 = $1,200. Planned loss $400 (1R).
    // Bid 5.00 → open P&L = (5.00-4.00) x 3 x 100 = $300.
    // R = 300/400 = 0.75R.  Contract return = +25%.
    const c = selectExpressionCard({ ...base, bid: 5.00, ask: 5.20, plannedRDollars: 400 });
    expect(c.currentR).toBeCloseTo(0.75, 6);
    expect(c.contractReturnPct).toBeCloseTo(25, 6);
    expect(c.currentR).not.toBeCloseTo(c.contractReturnPct!, 3);
  });

  it("CAPITAL DEPLOYED is the debit, PLANNED LOSS is structural — not equal", () => {
    const c = selectExpressionCard({ ...base, bid: 4.00, ask: 4.10, plannedRDollars: 400 });
    expect(c.capitalDeployed).toBe(1200);
    expect(c.plannedLoss).toBe(400);
    expect(c.capitalDeployed).not.toBe(c.plannedLoss);
  });

  it("R stays null when 1R was never defined pre-entry", () => {
    // Canon: R is never back-filled from the debit.
    const c = selectExpressionCard({ ...base, bid: 5.00, ask: 5.20 });
    expect(c.currentR).toBeNull();
    expect(c.contractReturnPct).not.toBeNull();
  });

  it("carries an honest premium band at the invalidation level, not one dollar", () => {
    const c = selectExpressionCard({ ...base, bid: 4.00, ask: 4.10 });
    expect(c.atInvalidation.status).toBe("ESTIMATED");
    expect(c.atInvalidation.display).toContain("–");
    expect(c.atInvalidation.assumptions.length).toBeGreaterThan(0);
  });

  it("the band degrades to UNKNOWN when IV is unavailable", () => {
    const c = selectExpressionCard({ ...base, iv: null, bid: 4.00, ask: 4.10 });
    expect(c.atInvalidation.status).toBe("UNKNOWN");
    expect(c.atInvalidation.low).toBeNull();
  });

  it("surfaces uncovered quantity rather than implying protection", () => {
    const c = selectExpressionCard({ ...base, bid: 4.0, ask: 4.1, brokerAckedProtectedQty: 2 });
    expect(c.protection.uncoveredQty).toBe(1);
    expect(c.protection.sentence).toBe("POSITION 3 PROTECTED 2 UNPROTECTED 1");
    expect(c.protection.grade).not.toBe("BROKER-WORKING");
  });

  it("grades spread health from the real book", () => {
    expect(selectExpressionCard({ ...base, bid: 4.00, ask: 4.10 }).spreadHealth).toBe("TIGHT");
    expect(selectExpressionCard({ ...base, bid: 3.00, ask: 4.00 }).spreadHealth).toBe("WIDE");
    expect(selectExpressionCard({ ...base, bid: null, ask: null }).spreadHealth).toBe("UNKNOWN");
  });

  it("classifies time fit including 0DTE and expired", () => {
    expect(selectExpressionCard({ ...base, expiryMs: NOW + 4 * 60 * 60 * 1000 }).timeFit).toBe("0DTE");
    expect(selectExpressionCard({ ...base, expiryMs: NOW - 1000 }).timeFit).toBe("EXPIRED");
    expect(selectExpressionCard({ ...base, expiryMs: NOW + 60 * 24 * 60 * 60 * 1000 }).timeFit).toBe("LONG");
  });

  it("an unfilled request deploys no capital and protects nothing", () => {
    const c = selectExpressionCard({ ...base, qtyFilled: 0, bid: 4.0, ask: 4.1 });
    expect(c.capitalDeployed).toBeNull();
    expect(c.protection.grade).toBe("FLAT");
    expect(c.currentR).toBeNull();
  });
});
