import { describe, expect, it } from "vitest";

import { futuresProductFor, readFuturesOptionChain, strikesNear } from "./tastytradeFuturesChain";

// Shape per tastytrade's OpenAPI FuturesNestedOptionChainSerializer.
const SAMPLE = {
  futures: [
    { symbol: "/MNQH7", "root-symbol": "/MNQ", "expiration-date": "2027-03-19", "days-to-expiration": 169, "active-month": false },
    { symbol: "/MNQZ6", "root-symbol": "/MNQ", "expiration-date": "2026-12-18", "days-to-expiration": 78, "active-month": true },
  ],
  "option-chains": [{
    "underlying-symbol": "/MNQZ6", "root-symbol": "/MNQ", "exercise-style": "American",
    expirations: [{
      "underlying-symbol": "/MNQZ6", "option-root-symbol": "MQE", "expiration-date": "2026-10-16", "days-to-expiration": 15,
      "expiration-type": "Weekly", "settlement-type": "PM",
      strikes: [
        { "strike-price": "25100.0", call: "./MNQZ6 MQEV6 261016C25100", put: "./MNQZ6 MQEV6 261016P25100" },
        { "strike-price": "25000.0", call: "./MNQZ6 MQEV6 261016C25000", put: "./MNQZ6 MQEV6 261016P25000" },
      ],
    }],
  }],
};

describe("tastytrade futures-option chain", () => {
  it("reads the specific contracts (nearest first) and keeps every option's parent future", () => {
    const c = readFuturesOptionChain(SAMPLE);
    expect(c.futures.map(f => f.symbol)).toEqual(["/MNQZ6", "/MNQH7"]);
    expect(c.futures[0].activeMonth).toBe(true);
    expect(c.expirations[0]).toMatchObject({ parent: "/MNQZ6", optionRoot: "MQE", expiration: "2026-10-16", settlement: "PM" });
    expect(c.expirations[0].strikes.map(s => s.strike)).toEqual([25000, 25100]);
    expect(c.expirations[0].strikes[0].call).toBe("./MNQZ6 MQEV6 261016C25000");
  });

  it("an empty or malformed answer is an empty chain, never a guess", () => {
    expect(readFuturesOptionChain(null)).toEqual({ futures: [], expirations: [] });
    expect(readFuturesOptionChain({ "option-chains": [{ expirations: [{ strikes: [] }] }] }).expirations).toEqual([]);
  });

  it("chart symbols map to their futures product", () => {
    expect(futuresProductFor("NQ1!")).toBe("NQ");
    expect(futuresProductFor("MNQ1!")).toBe("MNQ");
    expect(futuresProductFor("/MNQZ6")).toBe("MNQ");
    expect(futuresProductFor("ES1!")).toBe("ES");
    expect(futuresProductFor("TSLA")).toBeNull();
  });

  it("starts at the money", () => {
    const strikes = Array.from({ length: 40 }, (_, i) => ({ strike: 24000 + i * 50, call: null, put: null }));
    const near = strikesNear(strikes, 25010, 6);
    expect(near.map(s => s.strike)).toEqual([24900, 24950, 25000, 25050, 25100, 25150]);
  });
});
