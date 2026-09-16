import { describe, expect, it } from "vitest";

import type { Order, Position } from "../paperTrade";
import { NEVER_GREEN_GRADES } from "../protectionState";
import { isProtectiveOrder, selectPaperProtection } from "./selectPaperProtection";

function pos(over: Partial<Position> = {}): Position {
  return { symbol: "TSLA", qty: 3, avgPx: 100, unrealPnl: 0, marketPx: 100, ...over };
}

function ord(over: Partial<Order> = {}): Order {
  return {
    id: "o1",
    symbol: "TSLA",
    side: "sell",
    type: "stop",
    qty: 3,
    status: "pending",
    ts: 0,
    ...over,
  } as Order;
}

describe("selectPaperProtection — coverage recognition", () => {
  it("counts a working sell stop as coverage for a long", () => {
    const state = selectPaperProtection({ position: pos(), orders: [ord()] });

    expect(state.grade).toBe("BROKER-WORKING");
    expect(state.sentence).toBe("POSITION 3 PROTECTED 3 UNPROTECTED 0");
    expect(state.fullyCovered).toBe(true);
  });

  it("counts a working buy stop as coverage for a short", () => {
    const state = selectPaperProtection({
      position: pos({ qty: -2 }),
      orders: [ord({ side: "buy", qty: 2 })],
    });

    expect(state.grade).toBe("BROKER-WORKING");
    expect(state.sentence).toBe("POSITION 2 PROTECTED 2 UNPROTECTED 0");
  });

  it("grades partial coverage MANUAL-DEGRADED and numbers the uncovered size", () => {
    const state = selectPaperProtection({ position: pos({ qty: 3 }), orders: [ord({ qty: 1 })] });

    expect(state.grade).toBe("MANUAL-DEGRADED");
    expect(state.sentence).toBe("POSITION 3 PROTECTED 1 UNPROTECTED 2");
    expect(state.uncoveredQty).toBe(2);
  });

  it("grades a naked position UNPROTECTED", () => {
    const state = selectPaperProtection({ position: pos(), orders: [] });

    expect(state.grade).toBe("UNPROTECTED");
    expect(state.sentence).toBe("POSITION 3 PROTECTED 0 UNPROTECTED 3");
  });

  it("sums several working stops toward one position", () => {
    const state = selectPaperProtection({
      position: pos({ qty: 3 }),
      orders: [ord({ id: "a", qty: 1 }), ord({ id: "b", qty: 2 })],
    });

    expect(state.protectedQty).toBe(3);
    expect(state.grade).toBe("BROKER-WORKING");
  });
});

describe("selectPaperProtection — what must NOT count as coverage", () => {
  // Each of these, if counted, would move the grade in the reassuring
  // direction. That is the direction that gets a trader hurt, so each one is
  // pinned separately rather than trusted to the type filter.

  it("a resting limit on the closing side is a TARGET, not protection", () => {
    const state = selectPaperProtection({ position: pos(), orders: [ord({ type: "limit" })] });

    expect(state.grade).toBe("UNPROTECTED");
    expect(state.protectedQty).toBe(0);
  });

  it("a stop on the SAME side as the position is an ADD, not protection", () => {
    // A buy stop above a long increases exposure when it triggers. Netting it
    // as coverage would be exactly backwards.
    const state = selectPaperProtection({ position: pos({ qty: 3 }), orders: [ord({ side: "buy" })] });

    expect(state.grade).toBe("UNPROTECTED");
    expect(state.protectedQty).toBe(0);
  });

  it.each(["filled", "cancelled", "rejected"] as const)(
    "a %s stop covers nothing",
    status => {
      const state = selectPaperProtection({ position: pos(), orders: [ord({ status })] });

      expect(state.grade).toBe("UNPROTECTED");
      expect(state.protectedQty).toBe(0);
    },
  );

  it("a stop on a different symbol covers nothing", () => {
    const state = selectPaperProtection({ position: pos(), orders: [ord({ symbol: "AAPL" })] });

    expect(state.protectedQty).toBe(0);
  });

  it("isProtectiveOrder states the three conditions directly", () => {
    const p = pos();

    expect(isProtectiveOrder(ord(), p)).toBe(true);
    expect(isProtectiveOrder(ord({ type: "limit" }), p)).toBe(false);
    expect(isProtectiveOrder(ord({ status: "cancelled" }), p)).toBe(false);
    expect(isProtectiveOrder(ord({ side: "buy" }), p)).toBe(false);
  });
});

describe("selectPaperProtection — honest degradation", () => {
  it("an unreadable book cannot render BROKER-WORKING", () => {
    // Fully covered on paper, but the book could not be read. Certainty must
    // not increase past what was actually observed.
    const state = selectPaperProtection({
      position: pos(),
      orders: [ord()],
      bookUnverified: true,
    });

    expect(state.grade).toBe("UNVERIFIED — LAST KNOWN");
  });

  it("does not claim WM-SUPERVISED by default", () => {
    // Nothing supervises the paper route. Defaulting this on would print a
    // claim that something is watching on a surface where nothing is.
    const state = selectPaperProtection({ position: pos(), orders: [] });

    expect(state.grade).not.toBe("WM-SUPERVISED");
  });

  it("reports FLAT for no position, and for an absent one", () => {
    for (const position of [null, undefined, pos({ qty: 0 })]) {
      const state = selectPaperProtection({ position, orders: [ord()] });

      expect(state.grade).toBe("FLAT");
      expect(state.sentence).toBe("FLAT");
    }
  });

  it("defers the §14.3 clamp to the owner instead of re-implementing it", () => {
    // Over-coverage (reconciliation lag) must never render negative uncovered
    // size, which would read as over-protected.
    const state = selectPaperProtection({ position: pos({ qty: 2 }), orders: [ord({ qty: 99 })] });

    expect(state.protectedQty).toBe(2);
    expect(state.uncoveredQty).toBe(0);
    expect(state.uncoveredQty).toBeGreaterThanOrEqual(0);
  });

  it("every grade it can emit with size open is a non-green grade or BROKER-WORKING", () => {
    // Guards the vocabulary: this adapter may never invent a reassuring grade.
    const grades = [
      selectPaperProtection({ position: pos(), orders: [] }).grade,
      selectPaperProtection({ position: pos(), orders: [ord({ qty: 1 })] }).grade,
      selectPaperProtection({ position: pos(), orders: [ord()], bookUnverified: true }).grade,
      selectPaperProtection({ position: pos(), orders: [], wmSupervising: true }).grade,
    ];

    for (const grade of grades) {
      expect([...NEVER_GREEN_GRADES, "BROKER-WORKING"]).toContain(grade);
    }
  });
});
