import { describe, expect, it } from "vitest";

import { emptyContractQuote } from "./tastyContractQuote";
import { compactOcc, overlayLiveQuote, tastyStreamerMap } from "./tastyOptionOverlay";

// Shape read from the owner's live /api/broker/tastytrade/chain?symbol=TSLA, 2026-10-01.
const CHAIN = { items: [{ expirations: [{ "expiration-date": "2026-10-02", strikes: [
  { "strike-price": "355.0", call: "TSLA  261002C00355000", "call-streamer-symbol": ".TSLA261002C355", put: "TSLA  261002P00355000", "put-streamer-symbol": ".TSLA261002P355" },
  { "strike-price": "357.5", call: "TSLA  261002C00357500", "call-streamer-symbol": ".TSLA261002C357.5", put: "TSLA  261002P00357500", "put-streamer-symbol": "" },
] }] }] };

describe("live equity-option quotes over the chain inventory", () => {
  it("maps Alpaca's OCC spelling to tastytrade's own streamer symbol — never assembled", () => {
    const m = tastyStreamerMap(CHAIN);
    expect(m.get(compactOcc("TSLA261002C00355000"))).toBe(".TSLA261002C355");
    expect(m.get("TSLA261002C00357500")).toBe(".TSLA261002C357.5");
    expect(m.has("TSLA261002P00357500")).toBe(false);
    expect(tastyStreamerMap({ data: CHAIN }).size).toBe(3);
    expect(tastyStreamerMap(null).size).toBe(0);
  });

  it("no live quote yet: the reference stands and the row is not called live", () => {
    const ref = { bid: 5.02, ask: 5.23, impliedVolatility: 0.69 };
    expect(overlayLiveQuote(ref, undefined)).toEqual({ fields: ref, live: false });
    expect(overlayLiveQuote(ref, emptyContractQuote(".TSLA261002C355"))).toEqual({ fields: ref, live: false });
  });

  it("a live quote replaces only the fields tastytrade sent", () => {
    const q = { ...emptyContractQuote(".TSLA261002C355"), bid: 5.1, ask: 5.3, delta: 0.51, iv: 0.66, quoteAt: 1 };
    const r = overlayLiveQuote({ bid: 5.02, ask: 5.23, last: 5.23, openInterest: 1200, impliedVolatility: 0.69 }, q);
    expect(r.live).toBe(true);
    expect(r.fields).toMatchObject({ bid: 5.1, ask: 5.3, delta: 0.51, impliedVolatility: 0.66, last: 5.23, openInterest: 1200 });
  });
});
