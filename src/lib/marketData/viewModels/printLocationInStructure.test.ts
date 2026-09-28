import { describe, expect, it } from "vitest";
import { printLocationInStructure } from "./printLocationInStructure";
import type { MarketStructureVM } from "./selectMarketStructure";

const S = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true, lookback: 3, barCount: 100, unconfirmedBars: 3, confirmationLagNote: "",
  swingHighs: [{ time: 100, price: 110 }, { time: 300, price: 120 }],
  swingLows: [{ time: 200, price: 100 }],
  lastSwingHigh: { time: 300, price: 120 }, lastSwingLow: { time: 200, price: 100 },
  bias: "HIGHER_HIGHS" as never, biasNote: "", insufficientNote: null, ...over,
});

describe("a print's location in structure", () => {
  it("uses only swings confirmed before the print (no lookahead)", () => {
    // At t=250 the 120 high (t=300) does not exist yet; the last high is 110.
    const r = printLocationInStructure(111, 250, S());
    expect(r.lastHigh?.price).toBe(110);
    expect(r.location).toBe("ABOVE_LAST_HIGH");
  });
  it("at / inside / below, with the tolerance stated", () => {
    expect(printLocationInStructure(120.1, 400, S()).location).toBe("AT_LAST_HIGH");
    expect(printLocationInStructure(105, 400, S()).location).toBe("INSIDE_RANGE");
    expect(printLocationInStructure(95, 400, S()).location).toBe("BELOW_LAST_LOW");
  });
  it("no structure read, or no swing before the print → UNREAD with its reason", () => {
    expect(printLocationInStructure(100, 50, S()).location).toBe("UNREAD");
    expect(printLocationInStructure(100, 400, S({ measured: false, insufficientNote: "too few bars" })).note).toBe("too few bars");
  });
});
