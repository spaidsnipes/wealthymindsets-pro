import { describe, expect, it } from "vitest";

import { callColumns, chainCell, DEFAULT_NARROW_PAIR, putColumns } from "./chainColumns";
import type { ContractQuoteState } from "./tastyContractQuote";

const NOW = 1_000_000;
const q = (o: Partial<ContractQuoteState>): ContractQuoteState => ({
  symbol: "SPY  261016C00780000", bid: 1.35, ask: 1.36, bidSize: 10, askSize: 12, last: 1.35, dayVolume: 100, iv: 0.142, delta: 0.46, gamma: 0.0271,
  theta: -0.269, vega: 0.31, openInterest: 5234, prevClose: 1.2, quoteAt: NOW - 500, tradeAt: null, greeksAt: NOW - 500, ...o,
} as ContractQuoteState);

describe("chain columns (ruling 2026-10-10)", () => {
  it("desktop shows all nine, BID · MID · ASK in reading order on both sides", () => {
    expect(putColumns(true, DEFAULT_NARROW_PAIR)).toEqual(["BID", "MID", "ASK", "SPREAD", "OI", "IV", "DELTA", "GAMMA", "THETA"]);
    expect(callColumns(true, DEFAULT_NARROW_PAIR)).toEqual(["THETA", "GAMMA", "DELTA", "IV", "OI", "SPREAD", "BID", "MID", "ASK"]);
  });
  it("tablet / phone: BID · ASK + one pair, default Mid · Spread, mirrored on the call side", () => {
    expect(DEFAULT_NARROW_PAIR).toBe("MID_SPREAD");
    expect(putColumns(false, "MID_SPREAD")).toEqual(["BID", "ASK", "MID", "SPREAD"]);
    expect(callColumns(false, "MID_SPREAD")).toEqual(["SPREAD", "MID", "BID", "ASK"]);
    expect(putColumns(false, "IV_OI")).toEqual(["BID", "ASK", "IV", "OI"]);
  });
  it("mid and spread only when both sides are live; spread in price units", () => {
    expect(chainCell(q({}), "LIVE", NOW, "MID")).toEqual({ text: "1.355", why: null });
    expect(chainCell(q({ bid: 1.3, ask: 1.4 }), "LIVE", NOW, "MID")).toEqual({ text: "1.35", why: null });
    expect(chainCell(q({}), "LIVE", NOW, "SPREAD")).toEqual({ text: "0.01", why: null });
    const one = chainCell(q({ ask: null }), "LIVE", NOW, "MID");
    expect(one.text).toBe("—");
    expect(one.why).toMatch(/both sides live — this quote is one-sided/);
    expect(chainCell(q({}), "DEGRADED", NOW, "SPREAD").text).toBe("—");
  });
  it("Greeks, IV and OI print the broker's value or — with why", () => {
    expect(chainCell(q({}), "LIVE", NOW, "IV").text).toBe("14.2%");
    expect(chainCell(q({}), "LIVE", NOW, "OI").text).toBe("5234");
    expect(chainCell(q({}), "LIVE", NOW, "GAMMA").text).toBe("0.0271");
    expect(chainCell(q({ delta: null }), "LIVE", NOW, "DELTA")).toEqual({ text: "—", why: "Greeks not received" });
    expect(chainCell(undefined, "LIVE", NOW, "BID")).toEqual({ text: "—", why: "not quoted on this stream yet" });
  });
});
