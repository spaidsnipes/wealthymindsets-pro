import { describe, it, expect } from "vitest";
import { selectProtectionState, NEVER_GREEN_GRADES, type ProtectionGrade } from "./protectionState";

/**
 * BUILD ORDER Step 7 — "PROTECTION IS A STATE, NOT A LINE" — and the two §14
 * invariants it carries:
 *   §14.2 the UI never says BROKER-WORKING without an ACK
 *   §14.3 protected quantity never exceeds filled quantity
 *
 * The Reality Baseline recorded Step 7 as having NO owner: a position could be
 * open with zero stop coverage and the product had no way to say so.
 */
describe("protection state (BUILD ORDER Step 7)", () => {
  it("is FLAT with no position", () => {
    const s = selectProtectionState({ filledQty: 0, brokerAckedProtectedQty: 0 });
    expect(s.grade).toBe("FLAT");
    expect(s.sentence).toBe("FLAT");
    expect(s.fullyCovered).toBe(false);
  });

  it("14.2 BROKER-WORKING requires acknowledged coverage of the whole position", () => {
    const acked = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 3 });
    expect(acked.grade).toBe("BROKER-WORKING");

    // Zero ACK — an intent that was never acknowledged is not protection.
    const noAck = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 0 });
    expect(noAck.grade).not.toBe("BROKER-WORKING");
    expect(noAck.grade).toBe("UNPROTECTED");
  });

  it("14.2 partial coverage is not BROKER-WORKING", () => {
    const s = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 2 });
    expect(s.grade).not.toBe("BROKER-WORKING");
    expect(s.uncoveredQty).toBe(1);
  });

  it("14.3 protected quantity can never exceed filled quantity", () => {
    // A reconciliation lag reporting more protection than position must not
    // produce a negative uncovered count — that reads as over-covered, which is
    // the reassuring and therefore dangerous direction.
    const s = selectProtectionState({ filledQty: 2, brokerAckedProtectedQty: 9 });
    expect(s.protectedQty).toBe(2);
    expect(s.uncoveredQty).toBe(0);
    expect(s.uncoveredQty).toBeGreaterThanOrEqual(0);
  });

  it("renders the §7 grammar exactly", () => {
    const s = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 2 });
    expect(s.sentence).toBe("POSITION 3 PROTECTED 2 UNPROTECTED 1");
  });

  it("names WM-SUPERVISED in words when WM holds the uncovered size", () => {
    const s = selectProtectionState({
      filledQty: 3, brokerAckedProtectedQty: 0, wmSupervising: true,
    });
    expect(s.grade).toBe("WM-SUPERVISED");
    expect(s.uncoveredQty).toBe(3);
  });

  it("falls to MANUAL-DEGRADED when a human holds partial uncovered size", () => {
    const s = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: 1 });
    expect(s.grade).toBe("MANUAL-DEGRADED");
    expect(s.uncoveredQty).toBe(2);
  });

  it("unverified broker state never increases certainty", () => {
    // Even with full acknowledged coverage, an unreadable broker must not be
    // upgraded to BROKER-WORKING (§9 DEGRADED: "Do not increase certainty").
    const s = selectProtectionState({
      filledQty: 3, brokerAckedProtectedQty: 3, brokerStateUnverified: true,
    });
    expect(s.grade).toBe("UNVERIFIED — LAST KNOWN");
  });

  describe("§14.1 — an unread book is not a flat book", () => {
    /**
     * The defect, stated plainly.
     *
     * `positionQty === 0` used to return FLAT before `brokerStateUnverified`
     * was ever consulted. But a zero reaches this function two completely
     * different ways: "we read the book and it holds nothing", and "we could
     * not read the book, so we counted nothing". The first is a FINDING. The
     * second is a DEFAULT wearing the finding's clothes, and §14.1 exists
     * because that specific substitution is how a screen tells a trader they
     * are safe when nobody checked.
     *
     * It was reachable on /paper for the whole life of the line: `positions`
     * starts as an empty `useState` array, so every first paint graded the book
     * FLAT — "No position is open, so there is nothing to protect" — while
     * `compileScene`, reading the same unhydrated ledger, correctly reported
     * POSITION UNCONFIRMED a few inches up the same screen.
     */
    it("does not grade an unreadable empty book FLAT", () => {
      const s = selectProtectionState({
        filledQty: 0,
        brokerAckedProtectedQty: 0,
        brokerStateUnverified: true,
      });
      expect(
        s.grade,
        "an unread book graded FLAT is a claim of flatness from no evidence",
      ).toBe("UNVERIFIED — LAST KNOWN");
    });

    it("does not let the §7 sentence re-assert the flatness the grade refused", () => {
      // The sentence is what a screen reader announces after the grade. Saying
      // "UNVERIFIED — LAST KNOWN. FLAT." would hand back the certainty the
      // grade had just withheld, in the louder half of the label.
      const s = selectProtectionState({
        filledQty: 0,
        brokerAckedProtectedQty: 0,
        brokerStateUnverified: true,
      });
      expect(s.sentence).toBe("POSITION UNCONFIRMED");
      expect(s.sentence).not.toContain("FLAT");
    });

    it("still grades an OBSERVED empty book FLAT, because that is a finding", () => {
      // The fix must not make flatness unsayable. A book that was read and
      // holds nothing is exactly what FLAT is for.
      const s = selectProtectionState({ filledQty: 0, brokerAckedProtectedQty: 0 });
      expect(s.grade).toBe("FLAT");
      expect(s.sentence).toBe("FLAT");
    });

    it("never reports FLAT while the book is unverified, at any size", () => {
      for (const filled of [0, 1, 3, 10]) {
        for (let acked = 0; acked <= filled; acked++) {
          const s = selectProtectionState({
            filledQty: filled,
            brokerAckedProtectedQty: acked,
            brokerStateUnverified: true,
          });
          expect(s.grade).toBe("UNVERIFIED — LAST KNOWN");
          // `fullyCovered` stays an arithmetic fact about the counts — the
          // grade, not the arithmetic, is what carries the doubt.
          expect(s.fullyCovered).toBe(filled > 0 && acked === filled);
        }
      }
    });
  });

  it("uncovered size is always numbered, never implied", () => {
    for (const filled of [1, 2, 5, 10]) {
      for (let acked = 0; acked <= filled; acked++) {
        const s = selectProtectionState({ filledQty: filled, brokerAckedProtectedQty: acked });
        expect(s.protectedQty + s.uncoveredQty).toBe(s.positionQty);
        if (s.uncoveredQty > 0) expect(s.sentence).toContain(`UNPROTECTED ${s.uncoveredQty}`);
      }
    }
  });

  it("tolerates non-finite and negative inputs without inventing coverage", () => {
    for (const bad of [Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      const s = selectProtectionState({ filledQty: bad, brokerAckedProtectedQty: bad });
      expect(s.positionQty).toBeGreaterThanOrEqual(0);
      expect(s.protectedQty).toBeLessThanOrEqual(s.positionQty);
      expect(s.uncoveredQty).toBeGreaterThanOrEqual(0);
    }
    // A NaN protected count against a real position must NOT read as covered.
    const s = selectProtectionState({ filledQty: 3, brokerAckedProtectedQty: Number.NaN });
    expect(s.protectedQty).toBe(0);
    expect(s.grade).toBe("UNPROTECTED");
  });

  it("no grade below full acknowledged coverage may be rendered green", () => {
    // §9: "No green shield. No green means safe."
    for (const g of NEVER_GREEN_GRADES) {
      expect(g).not.toBe("BROKER-WORKING");
      expect(g).not.toBe("FLAT");
    }
    const uncovered = selectProtectionState({ filledQty: 2, brokerAckedProtectedQty: 0 });
    expect(NEVER_GREEN_GRADES).toContain(uncovered.grade as ProtectionGrade);
  });
});
