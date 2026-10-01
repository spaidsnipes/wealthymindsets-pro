import { describe, expect, it } from "vitest";

import {
  CONTRACT_EVENT_FIELDS,
  applyContractEvent,
  buildContractFeedSetupFrame,
  buildContractSubscriptionFrame,
  decodeCompactFeedData,
  emptyContractQuote,
  readContractQuote,
} from "./tastyContractQuote";

const SYM = "./EWZ26C4750:XCME";

describe("tastytrade contract quotes over DXLink", () => {
  it("FEED_SETUP declares exactly the fields the decoder reads", () => {
    const f = buildContractFeedSetupFrame();
    expect(f.acceptDataFormat).toBe("COMPACT");
    expect(f.acceptEventFields).toEqual(Object.fromEntries(Object.entries(CONTRACT_EVENT_FIELDS).map(([k, v]) => [k, [...v]])));
  });

  it("subscribes every event type per symbol, dedupes, and can remove", () => {
    const f = buildContractSubscriptionFrame([SYM, ` ${SYM} `, ""], ["/ESZ26:XCME"]);
    expect((f.add as unknown[]).length).toBe(4);
    expect((f.remove as unknown[]).length).toBe(4);
    expect(f.reset).toBeUndefined();
  });

  it("decodes COMPACT data with several events and several types", () => {
    const events = decodeCompactFeedData([
      "Quote", ["Quote", SYM, 12.5, 13, 10, 7, "Quote", "/ESZ26:XCME", 7739.25, 7739.5, 20, 31],
      "Greeks", ["Greeks", SYM, 12.75, 0.18, 0.42, 0.001, -1.2, 0.3, 4.1],
    ]);
    expect(events.map(e => [e.type, e.symbol])).toEqual([["Quote", SYM], ["Quote", "/ESZ26:XCME"], ["Greeks", SYM]]);
    expect(events[2].values).toMatchObject({ volatility: 0.18, delta: 0.42, vega: 4.1 });
  });

  it("NaN and empty sides are unknown, never a price of zero", () => {
    let q = emptyContractQuote(SYM);
    q = applyContractEvent(q, decodeCompactFeedData(["Quote", ["Quote", SYM, "NaN", 2.5, 0, 3]])[0], 1000);
    expect(q.bid).toBeNull();
    expect(readContractQuote(q, "LIVE", 1500).state).toBe("ONE-SIDED");
    expect(readContractQuote(q, "LIVE", 1500).mark).toBeNull();
  });

  it("reads mark, spread and age from a two-sided quote, and names every missing state", () => {
    let q = emptyContractQuote(SYM);
    q = applyContractEvent(q, decodeCompactFeedData(["Quote", ["Quote", SYM, 12.5, 13, 10, 7]])[0], 1000);
    const r = readContractQuote(q, "LIVE", 4000);
    expect(r).toMatchObject({ mark: 12.75, spread: 0.5, ageMs: 3000, state: "LIVE" });
    expect(r.spreadPct).toBeCloseTo(3.92, 2);
    expect(readContractQuote(undefined, "LIVE", 0).state).toBe("WAITING FOR QUOTE");
    expect(readContractQuote(undefined, "DEGRADED", 0).state).toBe("STREAM DEGRADED");
    expect(readContractQuote(q, "NOT_CONNECTED", 0).state).toBe("NOT CONNECTED");
    expect(readContractQuote(q, "DEGRADED", 60_000).state).toBe("STREAM DEGRADED");
  });

  it("a Trade or Greeks event never erases a known quote", () => {
    let q = applyContractEvent(emptyContractQuote(SYM), decodeCompactFeedData(["Quote", ["Quote", SYM, 1, 2, 1, 1]])[0], 1);
    q = applyContractEvent(q, decodeCompactFeedData(["Trade", ["Trade", SYM, 1.5, 300, 2]])[0], 2);
    q = applyContractEvent(q, decodeCompactFeedData(["Greeks", ["Greeks", SYM, "NaN", "NaN", 0.5, "NaN", "NaN", "NaN", "NaN"]])[0], 3);
    expect(q).toMatchObject({ bid: 1, ask: 2, last: 1.5, dayVolume: 300, delta: 0.5, iv: null });
  });
});
