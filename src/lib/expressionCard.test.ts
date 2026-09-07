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

/**
 * H4 — STOCK SESSION IS NOT OPTION SESSION.
 *
 * Canon: "If optionTradableNow is NO: do not pretend GET ME IN NOW is
 * available. Say OPTION SESSION CLOSED or OPTION NOT TRADABLE NOW."
 *
 * The defect this guards is not a wrong number — it is a RIGHT number
 * presented as an offer. A BID captured at 15:59 is still a true bid at 19:00;
 * what stops being true is that anyone will take it. So every case below
 * separates WHAT IS IT WORTH from CAN I ACT, and asserts they never merge.
 */
describe("H4 — the contract has its own clock", () => {
  const openBook = { ...base, bid: 3.60, ask: 3.90 };

  it("grants sell-now only when the CONTRACT's own market is open", () => {
    const c = selectExpressionCard({
      ...openBook,
      underlyingSession: "RTH",
      optionSession: "RTH",
    });
    expect(c.tradability.optionTradableNow).toBe("YES");
    expect(c.sellNowAvailable).toBe(true);
    expect(c.tradability.note).toBeNull();
    expect(c.tradability.sessionsDiverged).toBe(false);
  });

  it("a closed contract keeps its premium but loses its offer", () => {
    const c = selectExpressionCard({
      ...openBook,
      underlyingSession: "CLOSED",
      optionSession: "CLOSED",
    });
    // The number survives — it is real provenance, not a guess.
    expect(c.currentPremium).toBe(3.60);
    expect(c.currentPremiumRole).toBe("BID");
    // The permission does not.
    expect(c.tradability.optionTradableNow).toBe("NO");
    expect(c.sellNowAvailable).toBe(false);
    expect(c.tradability.note).toContain("OPTION SESSION CLOSED");
  });

  it("THE H4 CASE: stock printing in EXTENDED, contract shut", () => {
    const c = selectExpressionCard({
      ...openBook,
      underlyingSession: "EXTENDED",
      optionSession: "CLOSED",
    });
    expect(c.sellNowAvailable).toBe(false);
    expect(c.tradability.sessionsDiverged).toBe(true);
    // Verdict first, reason second — never a blended sentence.
    expect(c.tradability.note).toMatch(/^OPTION SESSION CLOSED/);
    expect(c.tradability.note).toContain("EXTENDED");
    expect(c.tradability.note).toContain("different market");
  });

  it("the UNDERLYING's session never votes on the contract", () => {
    // Stock wide open. Contract shut. The stock does not rescue it.
    const shut = selectExpressionCard({
      ...openBook,
      underlyingSession: "RTH",
      optionSession: "CLOSED",
    });
    expect(shut.sellNowAvailable).toBe(false);

    // And the reverse: a closed stock does not shut a contract its own
    // venue reports as open.
    const open = selectExpressionCard({
      ...openBook,
      underlyingSession: "CLOSED",
      optionSession: "RTH",
    });
    expect(open.tradability.optionTradableNow).toBe("YES");
    expect(open.sellNowAvailable).toBe(true);
  });

  it("DROPPING the sessions fails CLOSED, never open", () => {
    // This is the exact shape that let the CLOSED/DELAYED defect survive on
    // /charts: an optional argument silently omitted. Here omission may only
    // ever cost a capability.
    const c = selectExpressionCard(openBook);
    expect(c.tradability.optionTradableNow).toBe("UNKNOWN");
    expect(c.sellNowAvailable).toBe(false);
    expect(c.tradability.note).toContain("OPTION SESSION UNKNOWN");
    expect(c.tradability.underlyingSession).toBe("UNKNOWN");
    // UNKNOWN is not divergence — two absences are not a disagreement.
    expect(c.tradability.sessionsDiverged).toBe(false);
  });

  it("null sessions are treated as absent, not as a state", () => {
    const c = selectExpressionCard({ ...openBook, underlyingSession: null, optionSession: null });
    expect(c.tradability.optionTradableNow).toBe("UNKNOWN");
    expect(c.sellNowAvailable).toBe(false);
  });

  it("EXTENDED and OVERNIGHT contracts fail closed and say which", () => {
    for (const s of ["EXTENDED", "OVERNIGHT"] as const) {
      const c = selectExpressionCard({ ...openBook, underlyingSession: s, optionSession: s });
      expect(c.tradability.optionTradableNow).toBe("NO");
      expect(c.sellNowAvailable).toBe(false);
      expect(c.tradability.note).toContain("OPTION NOT TRADABLE NOW");
      expect(c.tradability.note).toContain(s);
    }
  });

  it("a MODELED premium is never actionable, even in a wide-open market", () => {
    // H18. An open market does not turn a model into a counterparty.
    const c = selectExpressionCard({
      ...base,
      bid: null,
      ask: null,
      modeledPremium: 3.75,
      underlyingSession: "RTH",
      optionSession: "RTH",
    });
    expect(c.currentPremiumRole).toBe("MODELED");
    expect(c.tradability.optionTradableNow).toBe("YES");
    expect(c.sellNowAvailable).toBe(false);
  });

  it("no premium at all is not actionable in any session", () => {
    const c = selectExpressionCard({
      ...base,
      bid: null,
      ask: null,
      optionSession: "RTH",
      underlyingSession: "RTH",
    });
    expect(c.currentPremium).toBeNull();
    expect(c.sellNowAvailable).toBe(false);
  });

  it("sellNowAvailable is true ONLY when the note is null", () => {
    // The surface renders the note and hides the action off the same fact,
    // so the two may never disagree.
    const sessions = ["RTH", "EXTENDED", "OVERNIGHT", "CLOSED", "24X7", null] as const;
    for (const u of sessions) {
      for (const o of sessions) {
        const c = selectExpressionCard({ ...openBook, underlyingSession: u, optionSession: o });
        if (c.sellNowAvailable) {
          expect(c.tradability.note).toBeNull();
          expect(c.tradability.optionTradableNow).toBe("YES");
        }
        if (c.tradability.optionTradableNow !== "YES") {
          expect(c.tradability.note).not.toBeNull();
          expect(c.sellNowAvailable).toBe(false);
        }
      }
    }
  });

  it("never tells a trader to wait for something that is already available", () => {
    const sessions = ["RTH", "EXTENDED", "OVERNIGHT", "CLOSED", "24X7", null] as const;
    for (const u of sessions) {
      for (const o of sessions) {
        const note = selectExpressionCard({ ...openBook, underlyingSession: u, optionSession: o })
          .tradability.note;
        if (note === null) continue;
        expect(note).not.toMatch(/coming soon|eventually|needs wiring|try again later/i);
        // A designed market boundary is not an error condition.
        expect(note).not.toMatch(/\b(ERROR|FAILED|CRITICAL|WARNING)\b/);
      }
    }
  });

  it("tradability does not disturb the money numbers", () => {
    const open = selectExpressionCard({ ...openBook, optionSession: "RTH", underlyingSession: "RTH" });
    const shut = selectExpressionCard({ ...openBook, optionSession: "CLOSED", underlyingSession: "CLOSED" });
    // Closing a market changes what you may DO, not what you HOLD.
    expect(shut.capitalDeployed).toBe(open.capitalDeployed);
    expect(shut.currentPremium).toBe(open.currentPremium);
    expect(shut.contractReturnPct).toBe(open.contractReturnPct);
    expect(shut.protection.grade).toBe(open.protection.grade);
  });
});
