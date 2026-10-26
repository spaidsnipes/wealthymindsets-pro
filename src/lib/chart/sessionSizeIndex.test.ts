import { describe, expect, it } from "vitest";
import { SessionSizeIndex, sortedSessionSizes } from "./bigTradeTier";

/**
 * PERF P0 2026-10-25: the session's sorted print sizes are KEPT (SessionSizeIndex), not re-sorted on
 * every paint. The index must answer EXACTLY what sortedSessionSizes answers, through every change the
 * chart's print map goes through: appends to the forming bar, a new bar, the oldest bar dropped at the
 * 400-bar cap, a reset to a new map (symbol / timeframe / tick re-fold) — and do no full rebuild for
 * plain appends.
 */
type P = { bid: number; ask: number };
const rnd = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

describe("SessionSizeIndex = sortedSessionSizes, kept instead of rebuilt", () => {
  it("matches after appends, new bars, a dropped bar and a new map — appends never rebuild", () => {
    const r = rnd(7);
    const print = (): P => (r() < 0.5 ? { bid: +(r() * 3).toFixed(4), ask: 0 } : { bid: 0, ask: +(r() * 3).toFixed(4) });
    let acc = new Map<number, P[]>();
    const idx = new SessionSizeIndex();
    let t = 1000;
    acc.set(t, []);
    for (let step = 0; step < 600; step++) {
      const roll = r();
      if (roll < 0.06) { t += 15; acc.set(t, []); }
      else if (roll < 0.08 && acc.size > 3) { acc.delete(Math.min(...acc.keys())); }
      else if (roll < 0.085) { acc = new Map([[t, [print()]]]); }
      else { const n = 1 + Math.floor(r() * 4); for (let k = 0; k < n; k++) acc.get(t)!.push(print()); }
      if (r() < 0.02) acc.get(t)!.push({ bid: 0, ask: 0 }); // a zero-size row is never ranked
      const before = idx.rebuilds;
      const got = Array.from(idx.sync(acc));
      expect(got).toEqual(Array.from(sortedSessionSizes(acc.values())));
      if (step > 0 && roll >= 0.085) expect(idx.rebuilds).toBe(before); // plain append / new bar: merged, not rebuilt
    }
    expect(idx.rebuilds).toBeGreaterThan(1);
    expect(idx.rebuilds).toBeLessThan(80);
  });

  it("a shrunk print list rebuilds rather than keep sizes that left", () => {
    const acc = new Map<number, P[]>([[1, [{ bid: 1, ask: 0 }, { bid: 2, ask: 0 }]]]);
    const idx = new SessionSizeIndex();
    expect(Array.from(idx.sync(acc))).toEqual([1, 2]);
    acc.set(1, [{ bid: 5, ask: 0 }]);
    expect(Array.from(idx.sync(acc))).toEqual([5]);
  });
});
