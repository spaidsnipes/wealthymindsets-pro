import { describe, it, expect } from "vitest";
import { selectTickerChangeDisplay } from "./selectTickerChangeDisplay";

describe("selectTickerChangeDisplay", () => {
  it("withholds the 'no reference close yet' state (both exactly zero)", () => {
    // The exact prod state: real price streaming, change still at its initial 0.
    const d = selectTickerChangeDisplay({ change: 0, changePct: 0 });
    expect(d.displayable).toBe(false);
    expect(d.direction).toBe("flat");
  });

  it("never reports 'up' for a zero change", () => {
    expect(selectTickerChangeDisplay({ change: 0, changePct: 0 }).direction).not.toBe("up");
  });

  it("displays a genuine gain and loss with correct direction", () => {
    const up = selectTickerChangeDisplay({ change: 1906.48, changePct: 2.49 });
    expect(up.displayable).toBe(true);
    expect(up.direction).toBe("up");
    expect(up.changePct).toBe(2.49);

    const down = selectTickerChangeDisplay({ change: -42.75, changePct: -0.22 });
    expect(down.displayable).toBe(true);
    expect(down.direction).toBe("down");
  });

  it("withholds non-finite values", () => {
    expect(selectTickerChangeDisplay({ change: Number.NaN, changePct: 1 }).displayable).toBe(false);
    expect(selectTickerChangeDisplay({ change: 1, changePct: Number.POSITIVE_INFINITY }).displayable).toBe(false);
  });

  it("withholds absent values instead of manufacturing 0.00", () => {
    // SymbolInfoHeader did `changePct?.toFixed(2) ?? "0.00"` — inventing a zero.
    expect(selectTickerChangeDisplay({ change: 5 }).displayable).toBe(false);
    expect(selectTickerChangeDisplay({ changePct: 5 }).displayable).toBe(false);
    expect(selectTickerChangeDisplay({ change: null, changePct: null }).displayable).toBe(false);
    expect(selectTickerChangeDisplay(null).displayable).toBe(false);
    expect(selectTickerChangeDisplay(undefined).displayable).toBe(false);
  });

  it("a withheld result always reads zero and flat, so a careless caller degrades safely", () => {
    for (const t of [null, undefined, {}, { change: 0, changePct: 0 }, { change: Number.NaN, changePct: Number.NaN }]) {
      const d = selectTickerChangeDisplay(t as never);
      expect(d.change).toBe(0);
      expect(d.changePct).toBe(0);
      expect(d.direction).toBe("flat");
    }
  });

  it("displayable implies a non-zero percent", () => {
    for (const pct of [-5, -0.01, 0, 0.01, 5]) {
      const d = selectTickerChangeDisplay({ change: pct, changePct: pct });
      if (d.displayable) expect(d.changePct).not.toBe(0);
    }
  });
});
