import { describe, expect, it } from "vitest";
import { keelLength, readKeels, type KeelInput } from "./barDeltaKeel";

const row = (time: number, body: number, buy: number, sell: number, atr = 4): KeelInput =>
  ({ time, open: 100, close: 100 + body, atr, buy, sell, basis: "SIDES" });

describe("bar delta keel", () => {
  it("draws no keel without sided volume or on a balanced bar (silence is data)", () => {
    expect(readKeels([row(1, 2, 0, 0), row(2, 2, 50, 50)])).toEqual([]);
  });

  it("marks a strong keel that did not move its way as FAILED", () => {
    const [k] = readKeels([row(1, -2, 80, 20)]); // buyers won, bar closed down
    expect(k.ratio).toBeCloseTo(0.6);
    expect(k.failed).toBe(true);
    const [s] = readKeels([row(1, 0.1, 80, 20)]); // buyers won, bar barely moved
    expect(s.failed).toBe(true);
    const [ok] = readKeels([row(1, 3, 80, 20)]);
    expect(ok.failed).toBe(false);
  });

  it("tells increasing vs fading aggression through the sequence", () => {
    const ks = readKeels([row(1, 1, 60, 40), row(2, 2, 80, 20), row(3, 1, 55, 45), row(4, -1, 20, 80)]);
    expect(ks[0].change).toBeNull();
    expect(ks[1].change!).toBeGreaterThan(0);
    expect(ks[2].change!).toBeLessThan(0);
    expect(ks[3].change).toBeNull(); // sign flipped
  });

  it("length is proportional to the ratio and capped at the body width", () => {
    expect(keelLength(0.3, 10)).toBeCloseTo(5);
    expect(keelLength(-0.9, 10)).toBe(10);
    expect(keelLength(0.01, 10)).toBe(1);
  });
});
