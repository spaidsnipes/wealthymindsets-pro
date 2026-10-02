import { describe, expect, it } from "vitest";
import { fxCentresOpen, readFxMarketInfo } from "./fxMarketInfo";

describe("FX Market Info states clock facts (2026-10-02)", () => {
  it("centres in business hours by their own clocks", () => {
    expect(fxCentresOpen(new Date("2026-10-02T02:00:00Z"))).toEqual(["Sydney", "Tokyo"]); // Fri 12:00 Sydney, 11:00 Tokyo
    expect(fxCentresOpen(new Date("2026-10-02T14:00:00Z"))).toEqual(["London", "New York"]);
    expect(fxCentresOpen(new Date("2026-10-03T14:00:00Z"))).toEqual([]); // Saturday
  });
  it("pip and pair", () => {
    const by = Object.fromEntries(readFxMarketInfo("USDJPY", new Date("2026-10-02T02:00:00Z")).map(r => [r.label, r.value]));
    expect(by["Pip"]).toBe("0.01");
    expect(by["Pair"]).toBe("USD / JPY");
    expect(readFxMarketInfo("TSLA", new Date())).toEqual([]);
  });
});
