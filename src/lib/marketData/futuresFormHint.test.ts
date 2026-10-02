import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { futuresFormHint } from "./futuresFormHint";

describe("an empty chart on a bare futures root points at the contract", () => {
  it("offers the catalogued continuous contract", () => {
    expect(futuresFormHint("NQ")).toBe("NQ1!");
    expect(futuresFormHint("es")).toBe("ES1!");
    expect(futuresFormHint("GC")).toBe("GC1!");
    expect(futuresFormHint("CL")).toBe("CL1!");
  });
  it("never guesses for stocks, indices, crypto, or a symbol already in futures form", () => {
    expect(futuresFormHint("AAPL")).toBeNull();
    expect(futuresFormHint("SPX")).toBeNull();
    expect(futuresFormHint("BTC-USD")).toBeNull();
    expect(futuresFormHint("NQ1!")).toBeNull();
    expect(futuresFormHint("/NQ")).toBeNull();
  });
  it("the refusal note carries the hint as a working door", () => {
    const note = readFileSync("src/components/chart/BarHistoryRefusalNote.tsx", "utf8");
    expect(note).toContain("data-testid=\"bar-history-futures-hint\"");
    expect(note).toContain("pointerEvents: \"auto\"");
    const chart = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(chart).toContain("futuresHint={futuresFormHint(symbol)}");
  });
});
