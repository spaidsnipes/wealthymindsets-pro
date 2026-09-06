/**
 * A rejected paper order must say WHY.
 *
 * WHY THIS FILE EXISTS (2026-09-05). /paper's fill loop computed a real,
 * human-readable rejection reason for every order it refused and then threw it
 * away one line later:
 *
 *   const reject = selectOrderRejection({ ... });          // the sentence
 *   if (reject) rejects.push({ id: ord.id, reason: reject });
 *   ...
 *   const byId = new Map(rejects.map(r => [r.id, r.reason]));
 *   setOrders(prev => prev.map(o =>
 *     byId.has(o.id) ? { ...o, status: "rejected" } : o));  // only has()
 *
 * The Map held the reason and only `has()` was ever called on it. `Order` had
 * no field to put it in, and the blotter rendered `{ord.status}` — the bare
 * word "rejected" in a red chip, with nothing beside it.
 *
 * So a trader who tried to buy four NQ contracts on a $100,000 account saw the
 * order go red and learned nothing. Canon weakness #9 PAPER-FILL
 * OVERCONFIDENCE: position sizing is the single habit paper trading exists to
 * build, and "rejected" does not teach it. "This order costs $435,000 and the
 * account holds $100,000" does. selectOrderRejection's own doc says it
 * "Returns a human reason for the reject" — the owner produced the truth and
 * the surface dropped it.
 *
 * The asymmetry is the tell: the sibling OPTIONS path never had this bug.
 * openOption does `if (reject) { setOptionReject(reject); return; }` and
 * renders it in a role="alert" box. One surface honoured the owner's output,
 * the other discarded it.
 *
 * WHAT IS PINNED. The behaviour is now owned by a pure function, so most of
 * this file is a real state matrix rather than a source scan. The two source
 * assertions that remain are scoped to a single extracted region — never a
 * whole-file `toContain`, which this repo has now watched pass against a live
 * defect three separate times.
 */

import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyOrderRejections,
  PAPER_KEY,
  placeChartMarketOrder,
  selectOrderRejection,
  STARTING_CASH,
  type Order,
  type OrderStatus,
} from "./paperTrade";

/** Minimal window.localStorage for the Node environment (see paperTrade.test.ts). */
class MemStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, v); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(_i: number) { return null; }
}
const g = globalThis as unknown as { window?: { localStorage: MemStorage } };
beforeEach(() => { g.window = { localStorage: new MemStorage() }; });
afterEach(() => { delete g.window; });

const order = (id: string, status: OrderStatus = "pending"): Order => ({
  id, symbol: "NQ1!", side: "buy", type: "market", qty: 1, status, ts: 0,
});

describe("applyOrderRejections — the reason travels with the status", () => {
  it("stamps the reason onto the rejected order", () => {
    const [o] = applyOrderRejections([order("a")], [{ id: "a", reason: "Insufficient cash — costs $435,000." }]);
    expect(o.status).toBe("rejected");
    // THE DEFECT. Before this, status flipped and the sentence vanished.
    expect(o.rejectReason).toBe("Insufficient cash — costs $435,000.");
  });

  it("leaves orders that were not rejected completely alone", () => {
    const before = [order("a"), order("b")];
    const after = applyOrderRejections(before, [{ id: "a", reason: "no cash" }]);
    expect(after[1]).toBe(before[1]);              // referentially untouched
    expect(after[1].status).toBe("pending");
    expect(after[1].rejectReason).toBeUndefined();
  });

  it("returns a copy, never the same array, so React sees a change", () => {
    const before = [order("a")];
    expect(applyOrderRejections(before, [])).not.toBe(before);
    expect(applyOrderRejections(before, [{ id: "a", reason: "x" }])).not.toBe(before);
  });

  it("empty rejects is a no-op that still copies", () => {
    const before = [order("a"), order("b")];
    expect(applyOrderRejections(before, [])).toEqual(before);
  });

  it("an id with no matching order is silently ignored, not thrown", () => {
    expect(() => applyOrderRejections([order("a")], [{ id: "ghost", reason: "x" }])).not.toThrow();
    expect(applyOrderRejections([order("a")], [{ id: "ghost", reason: "x" }])[0].status).toBe("pending");
  });

  it.each(["filled", "cancelled", "rejected"] as const)(
    "refuses to re-settle a %s order",
    status => {
      // TERMINAL_ORDER_STATUSES: a filled order already moved cash and
      // positions. Relabelling it "rejected" would make the ledger contradict
      // the account — the same principle canCancelOrder enforces.
      const [o] = applyOrderRejections([order("a", status)], [{ id: "a", reason: "too late" }]);
      expect(o.status).toBe(status);
      expect(o.rejectReason).toBeUndefined();
    },
  );

  it("carries the real sentence selectOrderRejection produces, end to end", () => {
    // Not a reason invented to match the assertion: this is the owner's own
    // output for one NQ contract at 21,750 against a fresh $100,000 account.
    const reason = selectOrderRejection({
      side: "buy", qty: 1, price: 21_750, cash: STARTING_CASH, multiplier: 20,
    });
    expect(reason).toBeTruthy();
    const [o] = applyOrderRejections([order("a")], [{ id: "a", reason: reason! }]);
    // The two numbers a trader needs in order to size the next one correctly.
    expect(o.rejectReason).toContain("$435,000");
    expect(o.rejectReason).toContain("$100,000");
  });
});

/**
 * The blotter row. Extracted STRUCTURALLY — the `orders.map(` body only — so a
 * `rejectReason` mentioned anywhere else in this 1,800-line file cannot vouch
 * for a row that does not render it. A whole-file `toContain` has now passed
 * against a live defect three times in this repo; it is not the mechanism.
 */
function orderRowSource(): string {
  const src = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8");
  const start = src.indexOf("{orders.map(ord=>(");
  expect(start, "order blotter map not found in /paper — this Sentinel is guarding nothing").toBeGreaterThan(-1);
  const end = src.indexOf("</>", start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("the /paper blotter renders the reason it was given", () => {
  it("the extractor really found the row, not an empty window", () => {
    // Positive control. slice(-1, n) degenerating into a window that contains
    // nothing is exactly how a sibling Sentinel passed against the source it
    // existed to reject.
    const row = orderRowSource();
    expect(row).toContain("ord.symbol");
    expect(row).toContain("ord.status");
    expect(row.length).toBeGreaterThan(400);
  });

  it("prints rejectReason inside the row", () => {
    expect(orderRowSource()).toContain("ord.rejectReason");
  });

  it("discloses a missing reason instead of rendering silence", () => {
    // An empty space beneath a red "rejected" chip reads as "there was no
    // reason". Orders persisted before the field existed have none, and that
    // gap must be named — the same rule formatChartContextNote follows.
    expect(orderRowSource()).toMatch(/rejectReason\s*\?\?/);
    expect(orderRowSource()).toMatch(/Reason not recorded/i);
  });

  it("the fill loop hands the reasons to the owner rather than mapping inline", () => {
    const src = readFileSync(resolve(__dirname, "../app/paper/page.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("applyOrderRejections(prev, rejects)");
    // THE DEFECT, verbatim. Reintroducing the inline map is how the reason gets
    // separated from the status again.
    expect(src).not.toMatch(/byId\.has\(o\.id\)\s*\?/);
  });
});

describe("placeChartMarketOrder consults the funding owner", () => {
  // NOTE ON SCOPE, stated rather than implied: this path has ZERO production
  // callers (chartOrderContractCoverage.test.ts asserts that as a named
  // blocker), so what follows closes a LATENT hole, not a live defect. It is
  // closed anyway so that whoever wires the one-click chart order up inherits
  // the guard instead of rediscovering it.
  const seed = (cash: number) => {
    g.window!.localStorage.setItem(PAPER_KEY, JSON.stringify({
      revision: 0, cash, positions: [], orders: [], trades: [],
      equity: [{ ts: 0, equity: cash }], optionPositions: [],
    }));
  };
  const stored = () => JSON.parse(g.window!.localStorage.getItem(PAPER_KEY)!);

  it("refuses a BUY the account cannot fund, and says why", () => {
    seed(1_000);
    const r = placeChartMarketOrder("TSLA", "buy", 100, 400);   // $40,000
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Insufficient cash");
    expect(r.error).toContain("$40,000");
  });

  it("does not write a rejected order into the ledger", () => {
    seed(1_000);
    placeChartMarketOrder("TSLA", "buy", 100, 400);
    expect(stored().orders).toEqual([]);
    expect(stored().cash).toBe(1_000);                           // untouched
  });

  it("applies the contract multiplier to the funding test", () => {
    // One NQ contract at 21,750 is $435,000 of notional, not $21,750. Without
    // the multiplier a $100,000 account is told it can afford four of them.
    seed(STARTING_CASH);
    expect(placeChartMarketOrder("NQ1!", "buy", 1, 21_750).ok).toBe(false);
    expect(placeChartMarketOrder("TSLA", "buy", 1, 21_750).ok).toBe(true);
  });

  it("still lets an affordable BUY through", () => {
    seed(STARTING_CASH);
    const r = placeChartMarketOrder("TSLA", "buy", 10, 100);
    expect(r.ok).toBe(true);
    expect(r.cash).toBe(STARTING_CASH - 1_000);
  });

  it("does not block a SELL — short margin is not modelled and is not invented", () => {
    // selectOrderRejection deliberately declines to reject sells; a short needs
    // a margin model that nobody here is guessing at.
    seed(0);
    expect(placeChartMarketOrder("TSLA", "sell", 1, 100).ok).toBe(true);
  });
});
