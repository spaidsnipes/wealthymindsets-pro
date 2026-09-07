import { describe, it, expect } from "vitest";
import {
  parsePaperSnapshot,
  isValidPosition,
  isValidOrder,
  isValidTrade,
  isValidEquityPoint,
  isAddressableOptionRecord,
  STARTING_CASH,
  type PaperState,
} from "./paperTrade";

/**
 * §24 D — CAPITAL PROTECTION. The paper book's deserializer validated
 * CONTAINERS, not CONTENTS:
 *
 *     positions: Array.isArray(s.positions) ? s.positions : []
 *
 * so `[{ symbol: null, qty: "abc" }]` arrived downstream typed as Position[],
 * and every money calculation trusted it. The medium makes that reachable
 * rather than theoretical — capitalReach already establishes the book lives in
 * BROWSER_LOCAL storage, writable by the user, an extension, or an older build.
 *
 * The law under test: a record WM cannot read is refused and counted, never
 * repaired and never silently discarded.
 */

const goodPosition = { symbol: "TSLA", qty: 10, avgPx: 380, unrealPnl: 12, marketPx: 381.2 };
const goodOrder = {
  id: "o1", symbol: "TSLA", side: "buy", type: "market",
  qty: 10, status: "filled", ts: 1_788_000_000_000,
};
const goodTrade = { id: "t1", symbol: "TSLA", side: "buy", qty: 10, px: 380, ts: 1_788_000_000_000 };
const goodEquity = { ts: 1_788_000_000_000, equity: 100_000 };
const goodOption = { id: "op1", underlying: "TSLA", type: "call", strike: 380 };

function snap(partial: Record<string, unknown>) {
  const s = parsePaperSnapshot(JSON.stringify({ revision: 3, cash: 99_000, ...partial }));
  expect(s).not.toBeNull();
  return s!;
}

describe("element validators", () => {
  it("a position needs every money field to be a real number", () => {
    expect(isValidPosition(goodPosition)).toBe(true);
    expect(isValidPosition({ ...goodPosition, qty: "abc" })).toBe(false);
    expect(isValidPosition({ ...goodPosition, symbol: null })).toBe(false);
    expect(isValidPosition({ ...goodPosition, avgPx: NaN })).toBe(false);
    expect(isValidPosition({ ...goodPosition, marketPx: Infinity })).toBe(false);
    // A missing field is not a zero.
    const { unrealPnl, ...missing } = goodPosition;
    void unrealPnl;
    expect(isValidPosition(missing)).toBe(false);
  });

  it("rejects non-objects and arrays outright", () => {
    for (const v of [null, undefined, 5, "x", [], [goodPosition]]) {
      expect(isValidPosition(v)).toBe(false);
      expect(isValidOrder(v)).toBe(false);
      expect(isValidTrade(v)).toBe(false);
      expect(isValidEquityPoint(v)).toBe(false);
      expect(isAddressableOptionRecord(v)).toBe(false);
    }
  });

  it("an order's enums must be members, not merely strings", () => {
    expect(isValidOrder(goodOrder)).toBe(true);
    expect(isValidOrder({ ...goodOrder, side: "BUY" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, type: "iceberg" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, status: "working" })).toBe(false);
  });

  it("optional order fields must be absent or valid — never present and junk", () => {
    // The pre-rejectReason schema must still load; that is the whole reason
    // these fields are optional.
    expect(isValidOrder({ ...goodOrder, limitPx: undefined })).toBe(true);
    expect(isValidOrder({ ...goodOrder, status: "rejected", rejectReason: "no buying power" })).toBe(true);
    // But a corrupt optional is corruption.
    expect(isValidOrder({ ...goodOrder, limitPx: "380" })).toBe(false);
    expect(isValidOrder({ ...goodOrder, fillPx: null })).toBe(false);
    expect(isValidOrder({ ...goodOrder, rejectReason: 42 })).toBe(false);
  });

  it("an equity point with a NaN reading is not a reading", () => {
    expect(isValidEquityPoint(goodEquity)).toBe(true);
    expect(isValidEquityPoint({ ts: 1, equity: NaN })).toBe(false);
    expect(isValidEquityPoint({ ts: "1", equity: 5 })).toBe(false);
  });

  it("option records are checked only for addressability, not shape", () => {
    // /paper owns the option shape (§24). Asserting strike/expiry here would
    // create a second owner that can disagree with the first.
    expect(isAddressableOptionRecord(goodOption)).toBe(true);
    expect(isAddressableOptionRecord({ id: "op2" })).toBe(true);
    expect(isAddressableOptionRecord({ underlying: "TSLA" })).toBe(false);
    expect(isAddressableOptionRecord({ id: "" })).toBe(false);
  });
});

describe("parsePaperSnapshot — refuse, count, never repair", () => {
  it("a clean book reports zero rejections", () => {
    const s = snap({
      positions: [goodPosition], orders: [goodOrder],
      trades: [goodTrade], equity: [goodEquity], optionPositions: [goodOption],
    });
    expect(s.integrity.rejected).toBe(0);
    expect(s.state.positions).toHaveLength(1);
    expect(s.state.revision).toBe(3);
    expect(s.state.cash).toBe(99_000);
  });

  it("THE DEFECT: a corrupt position no longer reaches the money math", () => {
    const s = snap({ positions: [goodPosition, { symbol: null, qty: "abc" }] });
    expect(s.state.positions).toEqual([goodPosition]);
    expect(s.integrity.positions).toBe(1);
    expect(s.integrity.rejected).toBe(1);
    // The survivor is untouched — dropping is not editing.
    expect(s.state.positions[0]).toEqual(goodPosition);
  });

  it("counts rejections per book, not just in total", () => {
    const s = snap({
      positions: [goodPosition, {}],
      orders: [{ ...goodOrder, status: "working" }],
      trades: [goodTrade, goodTrade, null],
      equity: [goodEquity],
      optionPositions: [{ noId: true }, { noId: true }],
    });
    expect(s.integrity.positions).toBe(1);
    expect(s.integrity.orders).toBe(1);
    expect(s.integrity.trades).toBe(1);
    expect(s.integrity.equity).toBe(0);
    expect(s.integrity.optionPositions).toBe(2);
    expect(s.integrity.rejected).toBe(5);
  });

  it("the total is always the sum of its books", () => {
    const s = snap({
      positions: [{}, {}], orders: [1], trades: ["x"], equity: [null], optionPositions: [{}],
    });
    const { rejected, ...books } = s.integrity;
    expect(Object.values(books).reduce((a, b) => a + b, 0)).toBe(rejected);
  });

  it("never invents a number to replace one it refused", () => {
    const s = snap({ positions: [{ symbol: "TSLA", qty: "abc", avgPx: 1, unrealPnl: 1, marketPx: 1 }] });
    // No zero-filled ghost position.
    expect(s.state.positions).toHaveLength(0);
    expect(JSON.stringify(s.state)).not.toContain("abc");
  });

  it("a non-finite cash figure falls back rather than poisoning the book", () => {
    // NaN survives JSON.stringify as null, which is the realistic corruption.
    const s = snap({ cash: null });
    expect(s.state.cash).toBe(STARTING_CASH);
  });

  it("a missing array is absence, not corruption", () => {
    const s = snap({});
    expect(s.integrity.rejected).toBe(0);
    expect(s.state.positions).toEqual([]);
    expect(s.state.orders).toEqual([]);
  });

  it("a non-array where an array belongs is absence, not a silent scalar", () => {
    const s = snap({ positions: "TSLA", orders: 7 });
    expect(s.state.positions).toEqual([]);
    expect(s.state.orders).toEqual([]);
    // Nothing was "rejected" because nothing was ever a record.
    expect(s.integrity.rejected).toBe(0);
  });

  it("an empty equity curve is still seeded so the chart has an origin", () => {
    const s = snap({ equity: [] });
    expect(s.state.equity).toHaveLength(1);
    expect(s.state.equity[0].equity).toBe(STARTING_CASH);
  });

  it("an equity curve of pure garbage is seeded AND counted", () => {
    const s = snap({ equity: [{ ts: 1, equity: "x" }, null] });
    expect(s.state.equity).toHaveLength(1);
    expect(s.state.equity[0].equity).toBe(STARTING_CASH);
    expect(s.integrity.equity).toBe(2);
  });

  it("refuses a snapshot that is not an object at all", () => {
    expect(parsePaperSnapshot("null")).toBeNull();
    expect(parsePaperSnapshot("[]")).toBeNull();
    expect(parsePaperSnapshot("5")).toBeNull();
    expect(parsePaperSnapshot("not json")).toBeNull();
  });

  it("a negative or fractional revision resets rather than corrupting the CAS", () => {
    // revision drives the compare-and-swap in savePaperState; a bad one there
    // would silently defeat conflict detection.
    expect(snap({ revision: -4 }).state.revision).toBe(0);
    expect(snap({ revision: 1.5 }).state.revision).toBe(0);
    expect(snap({ revision: "3" }).state.revision).toBe(0);
  });

  it("survives a book that is entirely unreadable without throwing", () => {
    const s = snap({
      positions: [null, 1, "x", [], {}],
      orders: [null, {}],
      trades: [{}],
      optionPositions: [null],
    });
    expect(s.integrity.rejected).toBe(9);
    expect(s.state.positions).toEqual([]);
  });

  it("is deterministic — the same raw book parses identically twice", () => {
    const raw = JSON.stringify({
      revision: 2, cash: 50_000,
      positions: [goodPosition, {}], orders: [goodOrder], trades: [], equity: [goodEquity],
    });
    const a = parsePaperSnapshot(raw)!;
    const b = parsePaperSnapshot(raw)!;
    expect(a.integrity).toEqual(b.integrity);
    expect(a.state.positions).toEqual(b.state.positions);
  });

  it("keeps every valid record — refusal is targeted, not a purge", () => {
    const many: PaperState["positions"] = Array.from({ length: 25 }, (_, i) => ({
      ...goodPosition, symbol: `S${i}`,
    }));
    const s = snap({ positions: [...many, { broken: true }] });
    expect(s.state.positions).toHaveLength(25);
    expect(s.integrity.positions).toBe(1);
  });
});
