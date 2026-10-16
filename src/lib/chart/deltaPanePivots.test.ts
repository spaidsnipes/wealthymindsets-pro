import { describe, expect, it } from "vitest";
import { deltaPaneDivergence, type PaneBar } from "./deltaPanePivots";

const bar = (i: number, high: number, delta: number, low = high - 5): PaneBar => ({ time: 1000 + i * 60, high, low, delta });

function series(highs: number[], deltas: number[], lows?: number[]): PaneBar[] {
  return highs.map((h, i) => bar(i, h, deltas[i], lows ? lows[i] : h - 5));
}

describe("deltaPaneDivergence (Codex Plate 08)", () => {
  it("names a higher high in price over a lower high in delta", () => {
    const highs =  [10, 11, 12, 20, 12, 11, 10, 11, 12, 13, 25, 13, 12, 11];
    const deltas = [ 5,  5,  5, 120, 5,  5,  5,  5,  5,  5, 60,  5,  5,  5];
    const d = deltaPaneDivergence(series(highs, deltas), 120);
    expect(d?.kind).toBe("BEARISH");
    expect(d?.prior.price).toBe(20);
    expect(d?.recent.price).toBe(25);
    expect(d?.recent.delta).toBe(60);
  });
  it("stays silent when delta confirmed the new high", () => {
    const highs =  [10, 11, 12, 20, 12, 11, 10, 11, 12, 13, 25, 13, 12, 11];
    const deltas = [ 5,  5,  5, 60,  5,  5,  5,  5,  5,  5, 120, 5,  5,  5];
    expect(deltaPaneDivergence(series(highs, deltas), 120)).toBeNull();
  });
  it("ignores a delta wobble below the band's own noise floor", () => {
    const highs =  [10, 11, 12, 20, 12, 11, 10, 11, 12, 13, 25, 13, 12, 11];
    const deltas = [ 5,  5,  5, 100, 5,  5,  5,  5,  5,  5, 95,  5,  5,  5];
    expect(deltaPaneDivergence(series(highs, deltas), 120)).toBeNull();
  });
  it("names a lower low over a higher (less negative) delta low", () => {
    const lows =   [30, 29, 28, 20, 28, 29, 30, 29, 28, 27, 15, 27, 28, 29];
    const highs = lows.map(l => l + 3);
    const deltas = [ 0,  0,  0, -80, 0,  0,  0,  0,  0,  0, -20, 0,  0,  0];
    const d = deltaPaneDivergence(series(highs, deltas, lows), 80);
    expect(d?.kind).toBe("BULLISH");
    expect(d?.recent.price).toBe(15);
  });
  it("too few bars → nothing", () => {
    expect(deltaPaneDivergence(series([1, 2, 3], [1, 2, 3]), 10)).toBeNull();
  });
});
