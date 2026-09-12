import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { afterEach, beforeEach } from "vitest";
import {
  applyFill,
  describeFillPriceAge,
  fillPriceAgeMs,
  clearPaperState,
  loadPaperState,
  isValidOrder,
  isValidTrade,
  parsePaperSnapshot,
  placeChartMarketOrder,
  savePaperState,
  subscribePaperState,
  PAPER_KEY,
  STARTING_CASH,
  type Order,
  type Position,
  type Trade,
} from "./paperTrade";
import { mintDecisionId } from "./traderMemory/decisionIdentity";

/**
 * SHIFT-J J-Bkt 2 — Orkin §22 state-matrix for applyFill.
 *
 * applyFill is the money-adjacent reducer shared between /paper and
 * every one-click chart order. It had ZERO tests before this file —
 * a canon rejection guarantee gap for Founder's Monday 2026-08-24
 * live launch (paper practice must produce the same shape as live).
 *
 * Enumerated states (all realistic branches):
 *   Prior position: NONE / LONG / SHORT
 *     × Incoming side: BUY / SELL
 *     × Size vs prior: same-direction-add / opposite-partial-close /
 *                      opposite-exact-close / opposite-over-flip
 *   Realized P&L sign: profit / loss / zero (open)
 *   Cash delta sign: outflow (buy) / inflow (sell)
 */

const mk = (over: Partial<Order>): Order => ({
  id: "test", symbol: "TSLA", side: "buy", type: "market",
  qty: 1, status: "filled", ts: 0,
  ...over,
});

describe("applyFill — flat account opens position", () => {
  it("BUY into empty positions → LONG position, cash outflow, realized 0", () => {
    const r = applyFill([], mk({ side: "buy", qty: 10 }), 100);
    expect(r.positions.length).toBe(1);
    expect(r.positions[0]).toMatchObject({ symbol: "TSLA", qty: 10, avgPx: 100, marketPx: 100 });
    expect(r.cashDelta).toBe(-1000);
    expect(r.realized).toBe(0);
    expect(r.trade.pnl).toBeUndefined();
  });
  it("SELL into empty positions → SHORT position (negative qty), cash inflow, realized 0", () => {
    const r = applyFill([], mk({ side: "sell", qty: 10 }), 100);
    expect(r.positions[0]).toMatchObject({ symbol: "TSLA", qty: -10, avgPx: 100 });
    expect(r.cashDelta).toBe(1000);
    expect(r.realized).toBe(0);
  });
  it("BUY into flat existing position (qty=0) → replaces with LONG at fill price", () => {
    const flat: Position = { symbol: "TSLA", qty: 0, avgPx: 0, unrealPnl: 0, marketPx: 0 };
    const r = applyFill([flat], mk({ side: "buy", qty: 5 }), 200);
    expect(r.positions).toEqual([{ symbol: "TSLA", qty: 5, avgPx: 200, unrealPnl: 0, marketPx: 200 }]);
    expect(r.realized).toBe(0);
  });
});

describe("applyFill — same-direction add (average-price update)", () => {
  it("LONG 10 @ $100 + BUY 5 @ $110 → LONG 15 @ ~$103.33", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 110);
    expect(r.positions[0].qty).toBe(15);
    expect(r.positions[0].avgPx).toBeCloseTo((100 * 10 + 110 * 5) / 15, 6);
    expect(r.cashDelta).toBe(-550);
    expect(r.realized).toBe(0);
  });
  it("SHORT -10 @ $100 + SELL 5 @ $90 → SHORT -15 with weighted-average avgPx", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(-15);
    // signedQty = -5, weighted avg = (100 * -10 + 90 * -5) / -15 = (-1000 -450)/-15 = 96.67
    expect(r.positions[0].avgPx).toBeCloseTo((100 * -10 + 90 * -5) / -15, 6);
    expect(r.cashDelta).toBe(450);
    expect(r.realized).toBe(0);
  });
});

describe("applyFill — opposite-direction partial close (realized P&L)", () => {
  it("LONG 10 @ $100 + SELL 5 @ $110 → LONG 5 remaining, realized +$50 on 5 shares", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 110);
    expect(r.positions[0].qty).toBe(5);
    expect(r.positions[0].avgPx).toBe(100); // preserved on partial close
    expect(r.cashDelta).toBe(550);
    expect(r.realized).toBe(50); // 5 * (110-100)
    expect(r.trade.pnl).toBe(50);
  });
  it("LONG 10 @ $100 + SELL 5 @ $90 → LONG 5 remaining, realized -$50", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(5);
    expect(r.realized).toBe(-50);
    expect(r.trade.pnl).toBe(-50);
  });
  it("SHORT -10 @ $100 + BUY 5 @ $90 → covering at lower is a profit → realized +$50", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 90);
    expect(r.positions[0].qty).toBe(-5);
    expect(r.positions[0].avgPx).toBe(100);
    expect(r.cashDelta).toBe(-450);
    expect(r.realized).toBe(50);
  });
  it("SHORT -10 @ $100 + BUY 5 @ $110 → covering at higher is a loss → realized -$50", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 5 }), 110);
    expect(r.realized).toBe(-50);
  });
});

describe("applyFill — opposite-direction EXACT close (position removed)", () => {
  it("LONG 10 @ $100 + SELL 10 @ $110 → position removed, realized +$100", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 10 }), 110);
    expect(r.positions.length).toBe(0);
    expect(r.cashDelta).toBe(1100);
    expect(r.realized).toBe(100);
  });
  it("SHORT -10 @ $100 + BUY 10 @ $90 → position removed, realized +$100", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 10 }), 90);
    expect(r.positions.length).toBe(0);
    expect(r.realized).toBe(100);
  });
});

describe("applyFill — opposite-direction OVER-flip (direction reversal)", () => {
  it("LONG 10 @ $100 + SELL 15 @ $110 → SHORT -5 at $110, realized +$100 on the 10 closed", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 15 }), 110);
    expect(r.positions[0].qty).toBe(-5);
    expect(r.positions[0].avgPx).toBe(110); // flipped side → new basis is the fill price
    expect(r.cashDelta).toBe(1650);
    expect(r.realized).toBe(100); // only the 10 that closed the long
  });
  it("SHORT -10 @ $100 + BUY 15 @ $90 → LONG +5 at $90, realized +$100 on the 10 covered", () => {
    const pos: Position = { symbol: "TSLA", qty: -10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "buy", qty: 15 }), 90);
    expect(r.positions[0].qty).toBe(5);
    expect(r.positions[0].avgPx).toBe(90);
    expect(r.realized).toBe(100);
  });
});

describe("applyFill — cross-symbol isolation", () => {
  it("Trading MSFT does not touch an existing TSLA position", () => {
    const tsla: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([tsla], mk({ symbol: "MSFT", side: "buy", qty: 5 }), 200);
    expect(r.positions.length).toBe(2);
    expect(r.positions.find(p => p.symbol === "TSLA")).toEqual(tsla);
    const msft = r.positions.find(p => p.symbol === "MSFT");
    expect(msft?.qty).toBe(5);
    expect(msft?.avgPx).toBe(200);
  });
});

describe("applyFill — cash-delta invariant (canon: cash = -signedQty * fillPx)", () => {
  it.each([
    { side: "buy" as const,  qty: 1,  fillPx: 100, expected: -100 },
    { side: "buy" as const,  qty: 5,  fillPx: 200, expected: -1000 },
    { side: "sell" as const, qty: 1,  fillPx: 100, expected: +100 },
    { side: "sell" as const, qty: 5,  fillPx: 200, expected: +1000 },
  ])("$side $qty @ $$fillPx → cashDelta $expected", ({ side, qty, fillPx, expected }) => {
    const r = applyFill([], mk({ side, qty }), fillPx);
    expect(r.cashDelta).toBe(expected);
  });
});

/**
 * DECISION IDENTITY SURVIVES THE ORDER→TRADE BOUNDARY.
 *
 * The §4 P0 artery is DECISION_ID → order → ACK/reject → FILL →
 * reconciliation → receipt. `Order.decisionId` existed and /paper's submit()
 * stamped a real one, but `applyFill` minted a Trade with no decision
 * identity, so the identity died at exactly the step where an order SUCCEEDED.
 * `trades[]` is the durable ledger persistence carries and any receipt or
 * reconciliation must read, so this broke receipt continuity for the orders
 * that worked.
 *
 * Two facts are guarded here and they are NOT the same fact:
 *   1. present → forwarded byte-identical, on every branch of the reducer.
 *   2. absent  → the trade has NO `decisionId` KEY. Not `undefined`. Persisted
 *      books are serialized and compared; "present but undefined" reads as a
 *      different fact from "absent", and the H1 rule is that readers disclose
 *      absence and never mint over it.
 */
describe("applyFill — decision identity forwarding (P0 artery)", () => {
  const DID = "wmd_test-decision-1" as Order["decisionId"];

  it("forwards the order's decisionId onto the trade when opening a position", () => {
    const r = applyFill([], mk({ side: "buy", qty: 10, decisionId: DID }), 100);
    expect(r.trade.decisionId).toBe(DID);
  });

  it("an order with NO decisionId produces a trade with NO decisionId KEY", () => {
    const r = applyFill([], mk({ side: "buy", qty: 10 }), 100);
    // Key-absence, not value-undefined: the reducer must never invent identity
    // and must never write an explicit `undefined` that serializes differently.
    expect("decisionId" in r.trade).toBe(false);
    expect(Object.keys(r.trade)).not.toContain("decisionId");
  });

  it("never invents a decisionId — an absent one stays absent through a flip", () => {
    const pos: Position = { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    const r = applyFill([pos], mk({ side: "sell", qty: 15 }), 110);
    expect("decisionId" in r.trade).toBe(false);
  });

  it.each([
    {
      branch: "same-direction add",
      prior: { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 } as Position,
      order: { side: "buy" as const, qty: 5 }, px: 110,
    },
    {
      branch: "opposite partial close",
      prior: { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 } as Position,
      order: { side: "sell" as const, qty: 5 }, px: 110,
    },
    {
      branch: "opposite EXACT close",
      prior: { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 } as Position,
      order: { side: "sell" as const, qty: 10 }, px: 110,
    },
    {
      branch: "opposite OVER-flip",
      prior: { symbol: "TSLA", qty: 10, avgPx: 100, unrealPnl: 0, marketPx: 100 } as Position,
      order: { side: "sell" as const, qty: 15 }, px: 110,
    },
    {
      branch: "flat-position replace",
      prior: { symbol: "TSLA", qty: 0, avgPx: 0, unrealPnl: 0, marketPx: 0 } as Position,
      order: { side: "buy" as const, qty: 5 }, px: 200,
    },
  ])("identity survives the $branch branch", ({ prior, order, px }) => {
    const r = applyFill([prior], mk({ ...order, decisionId: DID }), px);
    expect(r.trade.decisionId).toBe(DID);
  });

  it("the trade's own id is freshly minted and is NOT the decision id", () => {
    const r = applyFill([], mk({ side: "buy", qty: 1, decisionId: DID }), 100);
    expect(r.trade.decisionId).toBe(DID);
    expect(r.trade.id).not.toBe(DID);
    expect(r.trade.id.length).toBeGreaterThan(0);
  });
});

/**
 * THE BRAND MUST NOT LIE AT THE STORAGE BOUNDARY.
 *
 * `isValidOrder` / `isValidTrade` end in `v is Order` / `v is Trade`. Whatever
 * they wave through acquires the nominal `DecisionId` brand, and nothing
 * downstream re-checks it — the type says it does not have to. But their input
 * is `JSON.parse` output from localStorage, which a user or a bad write can put
 * anything into. Before this, neither predicate looked at `decisionId` at all.
 *
 * Absent stays valid: books written before §4 identity existed carry no
 * decision identity, and the H1 rule forbids inventing one for them.
 */
describe("paper persistence — decisionId validated at the trust boundary", () => {
  const order = (over: Record<string, unknown>) => ({
    id: "o1", symbol: "TSLA", side: "buy", type: "market",
    qty: 1, status: "filled", ts: 0, ...over,
  });
  const trade = (over: Record<string, unknown>) => ({
    id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 0, ...over,
  });

  it("accepts a record with NO decisionId — pre-§4 books stay readable", () => {
    expect(isValidOrder(order({}))).toBe(true);
    expect(isValidTrade(trade({}))).toBe(true);
  });

  it("accepts a genuinely minted decisionId", () => {
    const r = mintDecisionId({
      cause: "EXPLICIT_INTENT", deviceId: "ipad-1", nowMs: 1, nonce: "3f9c1e",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(isValidOrder(order({ decisionId: r.identity.decisionId }))).toBe(true);
    expect(isValidTrade(trade({ decisionId: r.identity.decisionId }))).toBe(true);
  });

  it.each([
    { what: "a number",            decisionId: 42 },
    { what: "an empty string",     decisionId: "" },
    { what: "an object",           decisionId: { id: "wmd_1" } },
    { what: "null",                decisionId: null },
    { what: "an unprefixed string", decisionId: "3f9c1e" },
    { what: "a broker order id",   decisionId: "wmd_ord-9" },
    { what: "a fill id",           decisionId: "wmd_fill-2" },
  ])("REJECTS the record when decisionId is $what", ({ decisionId }) => {
    expect(isValidOrder(order({ decisionId }))).toBe(false);
    expect(isValidTrade(trade({ decisionId }))).toBe(false);
  });

  it("a rejected record is DROPPED and COUNTED, never silently repaired", () => {
    // keepValid drops the entry and raises integrity.rejected, which is what
    // makes savePaperState answer RECOVERY REQUIRED instead of overwriting
    // bytes it did not understand. Disclosure, not quiet correction.
    const raw = JSON.stringify({
      revision: 1, cash: STARTING_CASH, positions: [], orders: [],
      trades: [trade({}), trade({ id: "t2", decisionId: "wmd_ord-9" })],
      equity: [], optionPositions: [],
    });
    const snap = parsePaperSnapshot(raw);
    expect(snap).not.toBeNull();
    expect(snap!.state.trades.map(t => t.id)).toEqual(["t1"]);
    expect(snap!.integrity.trades).toBe(1);
    expect(snap!.integrity.rejected).toBeGreaterThan(0);
  });

  it("a valid decisionId survives the persistence round-trip intact", () => {
    const r = mintDecisionId({
      cause: "EXPLICIT_INTENT", deviceId: "ipad-1", nowMs: 1, nonce: "3f9c1e",
    });
    if (!r.ok) throw new Error("mint failed");
    const raw = JSON.stringify({
      revision: 1, cash: STARTING_CASH, positions: [], orders: [],
      trades: [trade({ decisionId: r.identity.decisionId })],
      equity: [], optionPositions: [],
    });
    const snap = parsePaperSnapshot(raw);
    expect(snap!.integrity.rejected).toBe(0);
    expect(snap!.state.trades[0].decisionId).toBe(r.identity.decisionId);
  });
});

// ---------------------------------------------------------------------------
// J-Bkt 4 — loadPaperState + placeChartMarketOrder + clearPaperState state
// matrix. Uses a minimal localStorage polyfill in the Node test environment.
// ---------------------------------------------------------------------------

class MemStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(_i: number) { return null; }
}

type StorageListener = (event: StorageEvent) => void;
const listeners = new Set<StorageListener>();
const g = globalThis as unknown as {
  window?: {
    localStorage: MemStorage;
    addEventListener: (type: string, listener: StorageListener) => void;
    removeEventListener: (type: string, listener: StorageListener) => void;
  };
  localStorage?: MemStorage;
};

beforeEach(() => {
  listeners.clear();
  const ls = new MemStorage();
  g.window = {
    localStorage: ls,
    addEventListener: (type, listener) => { if (type === "storage") listeners.add(listener); },
    removeEventListener: (type, listener) => { if (type === "storage") listeners.delete(listener); },
  };
  g.localStorage = ls;
});
afterEach(() => {
  delete g.window;
  delete g.localStorage;
});

describe("loadPaperState — SSR fallback + corrupt-payload tolerance", () => {
  it("returns fresh state ($100k cash, empty positions/orders/trades) when no window", () => {
    delete g.window;
    delete g.localStorage;
    const s = loadPaperState();
    expect(s.cash).toBe(STARTING_CASH);
    expect(s.positions).toEqual([]);
    expect(s.orders).toEqual([]);
    expect(s.trades).toEqual([]);
    expect(s.equity.length).toBeGreaterThan(0);
  });
  it("returns fresh state when localStorage is empty", () => {
    const s = loadPaperState();
    expect(s.cash).toBe(STARTING_CASH);
  });
  it("returns fresh state when localStorage is corrupt JSON", () => {
    g.window!.localStorage.setItem(PAPER_KEY, "{this-is-not-json");
    const s = loadPaperState();
    expect(s.cash).toBe(STARTING_CASH);
    expect(s.positions).toEqual([]);
  });
  it("round-trips a saved state exactly", () => {
    const pos: Position = { symbol: "TSLA", qty: 5, avgPx: 100, unrealPnl: 0, marketPx: 100 };
    g.window!.localStorage.setItem(PAPER_KEY, JSON.stringify({
      cash: 50_000, positions: [pos], orders: [], trades: [], equity: [{ ts: 1, equity: 50_500 }],
      optionPositions: [{ id: "option-1", underlying: "TSLA" }],
    }));
    const s = loadPaperState();
    expect(s.cash).toBe(50_000);
    expect(s.positions).toEqual([pos]);
    expect(s.equity[0]).toEqual({ ts: 1, equity: 50_500 });
    expect(s.optionPositions).toEqual([{ id: "option-1", underlying: "TSLA" }]);
  });
  it("defaults missing arrays without crashing", () => {
    g.window!.localStorage.setItem(PAPER_KEY, JSON.stringify({ cash: 42 }));
    const s = loadPaperState();
    expect(s.cash).toBe(42);
    expect(s.positions).toEqual([]);
    expect(s.orders).toEqual([]);
    expect(s.trades).toEqual([]);
  });
});

describe("canonical paper persistence owner", () => {
  it("preserves unreadable bytes instead of rewriting them as a clean book", () => {
    const original = "{this-is-not-json";
    g.window!.localStorage.setItem(PAPER_KEY, original);
    const attempted = savePaperState(loadPaperState());
    expect(attempted.status).toBe("RECOVERY REQUIRED");
    expect(g.window!.localStorage.getItem(PAPER_KEY)).toBe(original);
  });

  it("preserves a partially readable book until explicit recovery", () => {
    const original = JSON.stringify({ cash: 90_000, positions: [{ symbol: null }], orders: [], trades: [], equity: [] });
    g.window!.localStorage.setItem(PAPER_KEY, original);
    const attempted = savePaperState(loadPaperState());
    expect(attempted.status).toBe("RECOVERY REQUIRED");
    expect(g.window!.localStorage.getItem(PAPER_KEY)).toBe(original);
  });
  it("reports PERSISTED only after exact browser readback", () => {
    const state = loadPaperState();
    const result = savePaperState(state);
    expect(result.status).toBe("PERSISTED");
    if (result.status !== "PERSISTED") throw new Error("expected persistence");
    expect(loadPaperState()).toEqual(result.state);
  });

  it("reports FAILED when the browser write throws", () => {
    vi.spyOn(g.window!.localStorage, "setItem").mockImplementation(() => { throw new Error("quota denied"); });
    expect(savePaperState(loadPaperState()).status).toBe("FAILED");
  });

  it("subscribes only to the canonical key and re-reads once", () => {
    const listener = vi.fn();
    const unsubscribe = subscribePaperState(listener);
    const dispatch = (key: string | null, newValue: string | null = null) => {
      for (const handle of listeners) handle({ key, newValue, storageArea: g.window!.localStorage } as unknown as StorageEvent);
    };
    dispatch("unrelated-key");
    expect(listener).not.toHaveBeenCalled();
    dispatch(PAPER_KEY, JSON.stringify(loadPaperState()));
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    dispatch(PAPER_KEY, JSON.stringify(loadPaperState()));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejects stale page A after chart B writes and preserves B byte-for-byte", () => {
    expect(savePaperState(loadPaperState()).status).toBe("PERSISTED");
    const stalePageA = loadPaperState();
    expect(placeChartMarketOrder("TSLA", "buy", 2, 100).ok).toBe(true);
    const chartB = loadPaperState();
    const chartBBytes = g.window!.localStorage.getItem(PAPER_KEY);

    const staleAttempt = savePaperState(stalePageA, stalePageA.revision);

    expect(staleAttempt.status).toBe("CONFLICT");
    expect(g.window!.localStorage.getItem(PAPER_KEY)).toBe(chartBBytes);
    expect(loadPaperState()).toEqual(chartB);
    expect(chartB.positions).toHaveLength(1);
    expect(chartB.orders).toHaveLength(1);
    expect(chartB.trades).toHaveLength(1);
  });

  it("does not let a stale snapshot resurrect state after logout clear", () => {
    expect(savePaperState(loadPaperState()).status).toBe("PERSISTED");
    const stale = loadPaperState();
    clearPaperState();

    const staleAttempt = savePaperState(stale, stale.revision);

    expect(staleAttempt.status).toBe("CONFLICT");
    const after = loadPaperState();
    expect(after.revision).toBe(0);
    expect(after.cash).toBe(STARTING_CASH);
    expect(after.positions).toEqual([]);
  });

  it("classifies an external logout clear as CLEARED, never PERSISTED", () => {
    expect(savePaperState(loadPaperState()).status).toBe("PERSISTED");
    const listener = vi.fn();
    subscribePaperState(listener);
    clearPaperState();

    for (const handle of listeners) {
      handle({ key: PAPER_KEY, newValue: null, storageArea: g.window!.localStorage } as unknown as StorageEvent);
    }

    expect(listener).toHaveBeenCalledOnce();
    const update = listener.mock.calls[0][0];
    expect(update.disposition).toBe("CLEARED");
    expect(update.state.revision).toBe(0);
    expect(update.state.positions).toEqual([]);
    expect(g.window!.localStorage.getItem(PAPER_KEY)).toBeNull();
  });

  it("fails closed on an externally malformed paper payload", () => {
    const listener = vi.fn();
    subscribePaperState(listener);
    for (const handle of listeners) {
      handle({ key: PAPER_KEY, newValue: "{malformed", storageArea: g.window!.localStorage } as unknown as StorageEvent);
    }
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ disposition: "INVALID" }));
  });

  it("keeps /paper free of a second storage owner", () => {
    const page = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
    expect(page).not.toContain("const PAPER_KEY");
    expect(page).not.toContain("localStorage.setItem");
    expect(page).not.toContain("localStorage.removeItem");
    expect(page).not.toMatch(/function\s+loadPaperState/);
  });
});

describe("placeChartMarketOrder — validation guards + persistence", () => {
  it("rejects empty symbol", () => {
    const r = placeChartMarketOrder("", "buy", 1, 100);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no symbol/i);
  });
  it("rejects non-positive qty", () => {
    expect(placeChartMarketOrder("TSLA", "buy", 0, 100).ok).toBe(false);
    expect(placeChartMarketOrder("TSLA", "buy", -1, 100).ok).toBe(false);
  });
  it("rejects non-finite or non-positive fillPx (no live price)", () => {
    expect(placeChartMarketOrder("TSLA", "buy", 1, 0).ok).toBe(false);
    expect(placeChartMarketOrder("TSLA", "buy", 1, NaN).ok).toBe(false);
    expect(placeChartMarketOrder("TSLA", "buy", 1, -100).ok).toBe(false);
  });
  it("persists a buy order + trade + updated cash into localStorage", () => {
    const r = placeChartMarketOrder("TSLA", "buy", 10, 100);
    expect(r.ok).toBe(true);
    expect(r.position).toMatchObject({ symbol: "TSLA", qty: 10, avgPx: 100 });
    expect(r.cash).toBe(STARTING_CASH - 1000);
    const raw = g.window!.localStorage.getItem(PAPER_KEY)!;
    const s = JSON.parse(raw);
    expect(s.positions).toHaveLength(1);
    expect(s.orders).toHaveLength(1);
    expect(s.trades).toHaveLength(1);
    expect(s.cash).toBe(STARTING_CASH - 1000);
  });
  it("caps orders + trades at 500 entries (canonical rolling window)", () => {
    // Seed 500 orders + trades already
    const seedOrders = Array.from({ length: 500 }, (_, i) => ({ id: `o${i}`, symbol: "X", side: "buy", type: "market", qty: 1, fillPx: 1, status: "filled", ts: i }));
    const seedTrades = Array.from({ length: 500 }, (_, i) => ({ id: `t${i}`, symbol: "X", side: "buy", qty: 1, px: 1, ts: i }));
    g.window!.localStorage.setItem(PAPER_KEY, JSON.stringify({
      cash: STARTING_CASH, positions: [], orders: seedOrders, trades: seedTrades, equity: [{ ts: 0, equity: STARTING_CASH }],
    }));
    const r = placeChartMarketOrder("TSLA", "buy", 1, 100);
    expect(r.ok).toBe(true);
    const s = JSON.parse(g.window!.localStorage.getItem(PAPER_KEY)!);
    expect(s.orders.length).toBe(500);
    expect(s.trades.length).toBe(500);
    // Newest at the front
    expect(s.orders[0].symbol).toBe("TSLA");
    expect(s.trades[0].symbol).toBe("TSLA");
  });
});

describe("clearPaperState — logout-isolation guarantee (canon §Sentinel)", () => {
  it("removes the paper key entirely; loadPaperState returns a fresh account", () => {
    g.window!.localStorage.setItem(PAPER_KEY, JSON.stringify({ cash: 1, positions: [{ symbol: "X", qty: 10, avgPx: 1, unrealPnl: 0, marketPx: 1 }] }));
    clearPaperState();
    expect(g.window!.localStorage.getItem(PAPER_KEY)).toBeNull();
    const s = loadPaperState();
    expect(s.cash).toBe(STARTING_CASH);
    expect(s.positions).toEqual([]);
  });
  it("is safe to call when there is no window (SSR / node)", () => {
    delete g.window;
    delete g.localStorage;
    expect(() => clearPaperState()).not.toThrow();
  });
});

/* ────────────────────────────────────────────────────────────────
 * FILL-PRICE OBSERVATION AGE
 *
 * A paper fill is stamped `ts: Date.now()`, but the quote behind its price
 * can be up to PAPER_DELAYED_QUOTE_MAX_AGE_MS (15 min) old — the readiness
 * view model measures that age and, before this, /paper read `.price` and
 * threw the rest away. The durable ledger therefore recorded a 14-minute-old
 * price as if it had been struck that instant (canon weakness #9 PAPER-FILL
 * OVERCONFIDENCE).
 *
 * The fix RECORDS what was already measured. It does not invent a slippage
 * model — minting numbers is the defect, not the cure.
 *
 * H1 governs the absent case: absence is not zero. `quoteObservedAt` stays
 * OPTIONAL, an unrecorded fill omits the KEY entirely (persisted books are
 * serialized and compared, so `undefined` is not the same as missing), and
 * readers return null for UNKNOWN rather than defaulting to `ts`.
 * ──────────────────────────────────────────────────────────────── */
describe("applyFill — quote observation time is forwarded, never invented", () => {
  it("records the forwarded observation time on the trade", () => {
    const r = applyFill([], mk({ side: "buy", qty: 1, id: "o1" }), 100, 1, 1_000);
    expect(r.trade.quoteObservedAt).toBe(1_000);
  });

  it("OMITS THE KEY when no observation time is supplied — absent, not undefined", () => {
    const r = applyFill([], mk({ side: "buy", qty: 1 }), 100);
    expect(
      Object.prototype.hasOwnProperty.call(r.trade, "quoteObservedAt"),
      "an unrecorded observation time must be a MISSING KEY. Persisted books " +
      "are JSON-serialized and byte-compared; an explicit `undefined` changes " +
      "the shape on the way in and silently vanishes on the way out.",
    ).toBe(false);
  });

  it("refuses a non-finite or non-positive observation time rather than storing it", () => {
    for (const bad of [Number.NaN, Infinity, 0, -1]) {
      const r = applyFill([], mk({ side: "buy", qty: 1 }), 100, 1, bad);
      expect(
        Object.prototype.hasOwnProperty.call(r.trade, "quoteObservedAt"),
        `${bad} is not an observation time and must not be recorded as one`,
      ).toBe(false);
    }
  });

  it("does NOT fall back to Date.now() when the caller passes null", () => {
    const before = Date.now();
    const r = applyFill([], mk({ side: "buy", qty: 1 }), 100, 1, null);
    // A Date.now() fallback would assert the price was perfectly fresh, which
    // is precisely the overclaim being removed. Silence is the honest answer.
    expect(r.trade.quoteObservedAt).toBeUndefined();
    expect(r.trade.ts).toBeGreaterThanOrEqual(before);
  });
});

describe("fillPriceAgeMs — UNKNOWN is null, never zero", () => {
  const base = (over: Partial<Trade>): Trade => ({
    id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 10_000, ...over,
  });

  it("derives the age from ts − quoteObservedAt", () => {
    expect(fillPriceAgeMs(base({ quoteObservedAt: 4_000 }))).toBe(6_000);
  });

  it("returns null — not 0 — when the trade never recorded an observation time", () => {
    expect(
      fillPriceAgeMs(base({})),
      "an unrecorded age is UNKNOWN. Returning 0 would claim the fill was " +
      "struck on a perfectly fresh quote.",
    ).toBeNull();
  });

  it("returns null for a price observed AFTER the fill was booked", () => {
    expect(
      fillPriceAgeMs(base({ ts: 10_000, quoteObservedAt: 11_000 })),
      "that is not a negative age, it is a chronology we do not believe",
    ).toBeNull();
  });

  it("returns 0 for a genuinely simultaneous observation — a real measurement", () => {
    expect(fillPriceAgeMs(base({ ts: 10_000, quoteObservedAt: 10_000 }))).toBe(0);
  });

  it("returns null when either timestamp is not finite", () => {
    expect(fillPriceAgeMs(base({ quoteObservedAt: Number.NaN }))).toBeNull();
    expect(fillPriceAgeMs(base({ ts: Number.NaN, quoteObservedAt: 1_000 }))).toBeNull();
  });
});

describe("describeFillPriceAge — discloses, and stays silent when it cannot", () => {
  const base = (over: Partial<Trade>): Trade => ({
    id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 10_000, ...over,
  });

  it("names sub-minute staleness in seconds", () => {
    expect(describeFillPriceAge(base({ ts: 10_000, quoteObservedAt: 6_000 })))
      .toBe("Filled at a price observed 4s earlier.");
  });

  it("names multi-minute staleness in minutes and seconds", () => {
    // 4m 12s — the shape of a real delayed-feed fill.
    const ts = 1_000_000;
    expect(describeFillPriceAge(base({ ts, quoteObservedAt: ts - 252_000 })))
      .toBe("Filled at a price observed 4m 12s earlier.");
  });

  it("returns null when unrecorded, so callers must render UNKNOWN themselves", () => {
    expect(describeFillPriceAge(base({}))).toBeNull();
  });
});

describe("isValidTrade — quoteObservedAt survives the persistence round trip", () => {
  it("accepts a trade carrying an observation time", () => {
    const t = { id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 10_000, quoteObservedAt: 4_000 };
    expect(isValidTrade(t)).toBe(true);
    expect(isValidTrade(JSON.parse(JSON.stringify(t)))).toBe(true);
  });

  it("STILL accepts a trade without one — the field is optional and must stay optional", () => {
    expect(
      isValidTrade({ id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 10_000 }),
      "every trade booked before this field existed lives in real saved books. " +
      "Requiring it would reject those books wholesale and trip recovery.",
    ).toBe(true);
  });

  it("rejects a trade whose observation time is the wrong type", () => {
    expect(isValidTrade({ id: "t1", symbol: "TSLA", side: "buy", qty: 1, px: 100, ts: 10_000, quoteObservedAt: "4000" })).toBe(false);
  });
});

describe("/paper fill loop forwards the measurement it used to discard", () => {
  const page = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8").replace(/\s+/g, " ");

  it("carries quoteObservedAt alongside fillPx in the fills batch", () => {
    expect(
      page,
      "the fills array dropped readiness.observedAt, so the ledger could not " +
      "tell a live fill from a 14-minute-old one",
    ).toMatch(/fills\.push\(\{ ord, fillPx, quoteObservedAt: readiness\.observedAt \}\)/);
  });

  it("passes it through the page's applyFill adapter to the shared owner", () => {
    expect(page).toMatch(/applyFill\(work, ord, fillPx, quoteObservedAt\)/);
    expect(page).toMatch(/applyFillShared\(positions, ord, fillPx, contractMultiplier\(ord\.symbol\), quoteObservedAt\)/);
  });

  it("never backfills the observation time with a clock read at the fill site", () => {
    expect(
      page,
      "Date.now() as a fallback observation time would restore the exact " +
      "overclaim this atom removes",
    ).not.toMatch(/quoteObservedAt: readiness\.observedAt \?\? Date\.now\(\)/);
  });
});
