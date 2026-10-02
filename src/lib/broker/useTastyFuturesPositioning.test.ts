import { describe, expect, it } from "vitest";
import { pickPositioningLegs } from "./useTastyFuturesPositioning";

const chain = {
  futures: [{ symbol: "/NQZ6", streamer: "/NQZ26:XCME", expiration: "2026-12-18", dte: 78, activeMonth: true }],
  expirations: [
    { parent: "/NQZ6", optionRoot: "NQ", expiration: "2026-10-09", dte: 8, type: "W", settlement: "PM", tickSizes: [], multiplier: 20, stopsTradingAt: null,
      strikes: [100, 99, 101, 130].map(k => ({ strike: k, call: `C${k}`, put: `P${k}`, callStreamer: `.C${k}`, putStreamer: `.P${k}` })) },
    { parent: "/NQZ6", optionRoot: "NQ", expiration: "2027-03-19", dte: 169, type: "Q", settlement: "AM", tickSizes: [], multiplier: 20, stopsTradingAt: null,
      strikes: [{ strike: 100, call: "CX", put: "PX", callStreamer: ".CX", putStreamer: ".PX" }] },
  ],
};

describe("pickPositioningLegs", () => {
  it("active parent, ≤ 60 DTE, strikes within ±4% of price, nearest first", () => {
    const legs = pickPositioningLegs(chain as never, 100);
    expect(new Set(legs.map(l => l.strike))).toEqual(new Set([99, 100, 101]));
    expect(legs.every(l => l.expiration === "2026-10-09")).toBe(true);
    expect(legs[0].strike).toBe(100);
    expect(legs.length).toBe(6);
  });
  it("no price, no legs", () => { expect(pickPositioningLegs(chain as never, 0)).toEqual([]); });
});
