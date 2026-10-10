/**
 * ONE broker readback for the ticket and the chart strip (Founder P0 2026-10-09): one poll, 3 s while
 * the ticket is open, 10 s otherwise, paused when hidden, nothing blanked on unmount. Read routes only.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { BrokerLinesResult } from "./brokerOrderLines";
import { READBACK_FAST_MS, READBACK_SLOW_MS, bookStripFrom, readbackFromAnswers, readbackIntervalMs, resolveBrokerContract, resetBrokerReadbackStoreForTest } from "./brokerReadbackStore";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");

it("the scanned sources are not empty", () => {
  expect(read("lib/execution/brokerReadbackStore.ts").length).toBeGreaterThan(2000);
  expect(read("lib/execution/useBrokerChartLines.ts").length).toBeGreaterThan(800);
});

describe("cadence", () => {
  it("nobody reading → no poll; hidden → paused; any FAST reader → 3 s; otherwise 10 s", () => {
    expect([READBACK_FAST_MS, READBACK_SLOW_MS]).toEqual([3_000, 10_000]);
    expect(readbackIntervalMs([], false)).toBeNull();
    expect(readbackIntervalMs([true, false], true)).toBeNull();
    expect(readbackIntervalMs([false], false)).toBe(10_000);
    expect(readbackIntervalMs([false, false], false)).toBe(10_000);
    expect(readbackIntervalMs([false, true], false)).toBe(3_000);
  });
});

describe("the readback is built only from two OK answers", () => {
  const orders = { state: "OK", accounts: [{ index: 0, tail: "SMPL", orders: [{ id: "1", status: "Live", state: "WORKING", symbol: "/NQZ6", action: "Sell to Close", quantity: 1, filled: 0, price: null, stopTrigger: "100", orderType: "Stop", externalId: null, cancellable: true, rejectReason: null, updatedAt: null }] }] };
  const positions = { state: "OK", accounts: [{ positions: [] }] };
  it("both OK → orders, the account each order came from, tails, an as-of", () => {
    const rb = readbackFromAnswers(orders, positions, 1234)!;
    expect(rb).toMatchObject({ asOfMs: 1234, ok: true, tails: ["SMPL"], orderAccounts: { "1": { index: 0, tail: "SMPL" } } });
    expect(rb.orders).toHaveLength(1);
  });
  it("either answer not OK → null (the caller keeps the last answer and marks it not-ok)", () => {
    expect(readbackFromAnswers({ state: "NOT_CONNECTED" }, positions, 1)).toBeNull();
    expect(readbackFromAnswers(orders, null, 1)).toBeNull();
    expect(readbackFromAnswers(null, null, 1)).toBeNull();
  });
});

describe("contract resolution — one answer per chart symbol", () => {
  it("a stock is its own contract; a coin is its USD pair; FX names none", () => {
    resetBrokerReadbackStoreForTest();
    expect(resolveBrokerContract("aapl")).toEqual({ state: "RESOLVED", contract: { symbol: "AAPL", streamer: "AAPL" } });
    expect(resolveBrokerContract("BTC-USD")).toEqual({ state: "RESOLVED", contract: { symbol: "BTC/USD", streamer: "BTC/USD:CXTALP" } });
    expect(resolveBrokerContract("EURUSD").state).toBe("NONE");
    expect(resolveBrokerContract("AAPL")).toBe(resolveBrokerContract("aapl"));
  });
});

describe("the strip's reading", () => {
  const clock = () => "2:31:05 PM";
  const RES = { state: "RESOLVED", contract: { symbol: "/NQZ6", streamer: "/NQZ6:XCME" } } as const;
  const res = (over: Partial<BrokerLinesResult>): BrokerLinesResult => ({ lines: [], readback: "FRESH", position: null, working: 0, asOfMs: 5, ...over });
  it("says where it stands before any answer", () => {
    expect(bookStripFrom({ state: "RESOLVING" }, null, clock)).toMatchObject({ state: "RESOLVING", words: "Naming the contract…" });
    expect(bookStripFrom({ state: "NONE", why: "no contract" }, null, clock)).toMatchObject({ state: "NO_CONTRACT", words: "no contract" });
    expect(bookStripFrom(RES, null, clock)).toMatchObject({ state: "NOT_READ", contract: "/NQZ6", freshness: "NEVER_READ" });
    expect(bookStripFrom(RES, res({ readback: "NEVER_READ", asOfMs: null }), clock).state).toBe("NOT_READ");
  });
  it("FLAT / LONG / SHORT with protection, working count and as-of — STALE is said", () => {
    expect(bookStripFrom(RES, res({ working: 2 }), clock)).toMatchObject({ state: "FLAT", working: 2, protection: null, words: "FLAT · 2 working · as of 2:31:05 PM" });
    const long = res({ working: 1, position: { row: { symbol: "/NQZ6", quantity: 2, direction: "Long", averageOpenPrice: 25010.25, instrumentType: null }, protection: "UNPROTECTED", pnlUsd: null } });
    expect(bookStripFrom(RES, long, clock)).toMatchObject({ state: "LONG", quantity: 2, averagePrice: 25010.25, protection: "UNPROTECTED", words: "LONG 2 @ 25010.25 · UNPROTECTED · 1 working · as of 2:31:05 PM" });
    const short = res({ readback: "STALE", working: 1, position: { row: { symbol: "/NQZ6", quantity: 1, direction: "Short", averageOpenPrice: 25000, instrumentType: null }, protection: "PROTECTED", pnlUsd: null } });
    const s = bookStripFrom(RES, short, clock);
    expect(s.state).toBe("SHORT");
    expect(s.freshness).toBe("STALE");
    expect(s.words).toBe("SHORT 1 @ 25000 · PROTECTED · 1 working · as of 2:31:05 PM · STALE — tastytrade has not answered since");
  });
});

describe("source: one poll, read routes only, nothing blanked", () => {
  const store = read("lib/execution/brokerReadbackStore.ts");
  const hook = read("lib/execution/useBrokerChartLines.ts");
  it("the store is the only place the orders / positions read routes are polled, and it only reads", () => {
    expect(store.match(/fetch\("\/api\/broker\/tastytrade\/(orders|positions)"/g)).toHaveLength(2);
    expect(store).not.toMatch(/method:\s*"(POST|DELETE|PUT|PATCH)"/);
    expect(store).toContain("if (reading) return;");
    expect(hook).not.toContain("fetch(");
    expect(hook).not.toContain("setInterval(");
    expect(hook).toContain("useBrokerReadback(enabled && !!contract, opts.fast ?? true)");
  });
  it("paused when hidden; the last answer survives an unmount", () => {
    expect(store).toContain('document.addEventListener("visibilitychange", () => schedule(!hidden()));');
    expect(store).toContain("return () => { readers.delete(id); schedule(false); };");
    // Unmounting a reader never resets the stored readback.
    expect(store.match(/state = \{ rb: EMPTY/g)).toHaveLength(1);       // only the test seam
  });
});
