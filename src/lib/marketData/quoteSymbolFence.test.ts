import { describe, expect, it } from "vitest";
import { quoteRoundIsCurrent } from "./quoteSymbolFence";

describe("quoteRoundIsCurrent", () => {
  it("accepts the active symbol's live round", () => {
    expect(quoteRoundIsCurrent("spy", "SPY", false)).toBe(true);
  });

  it("rejects a prior symbol after the new symbol reset", () => {
    expect(quoteRoundIsCurrent("TSLA", "SPY", true)).toBe(false);
    expect(quoteRoundIsCurrent("TSLA", "SPY", false)).toBe(false);
  });

  it("rejects a disposed round even when the user returns to that symbol", () => {
    expect(quoteRoundIsCurrent("TSLA", "TSLA", true)).toBe(false);
  });

  it("drops a deferred old quote after transition and accepts the new round", async () => {
    let activeSymbol = "TSLA";
    let oldDisposed = false;
    const applied: Array<{ symbol: string; price: number }> = [];
    let resolveOld!: (price: number) => void;
    const oldRound = new Promise<number>(resolve => { resolveOld = resolve; })
      .then(price => {
        if (quoteRoundIsCurrent("TSLA", activeSymbol, oldDisposed)) {
          applied.push({ symbol: "TSLA", price });
        }
      });

    activeSymbol = "SPY";
    oldDisposed = true;
    resolveOld(250);
    await oldRound;
    expect(applied).toEqual([]);

    if (quoteRoundIsCurrent("SPY", activeSymbol, false)) {
      applied.push({ symbol: "SPY", price: 500 });
    }
    expect(applied).toEqual([{ symbol: "SPY", price: 500 }]);
  });
});
