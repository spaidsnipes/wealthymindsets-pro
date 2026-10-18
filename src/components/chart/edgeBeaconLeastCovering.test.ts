import { describe, expect, it } from "vitest";
import { BEACON_H, placeBeaconLeastCovering } from "./edgeBeacon";

const frame = { plotLeft: 0, plotRight: 360, top: 60, bottom: 500 };
const over = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("edge beacon in a crowded frame", () => {
  it("never covers a word; with candles on every slot it takes the least-covered one", () => {
    // Words fill rows 0–2 across the plot; candles cover row 3 except a thin gap on the left.
    const hard = [0, 1, 2].map(k => ({ x: 0, y: 66 + k * (BEACON_H + 4), w: 360, h: BEACON_H }));
    const soft = [{ x: 60, y: 60, w: 300, h: 440 }, { x: 0, y: 160, w: 30, h: 40 }];
    const r = placeBeaconLeastCovering("above", 200, frame, hard, soft);
    expect(hard.some(h => over(r, h))).toBe(false);
    expect(r.x).toBeLessThan(60); // as far left as the gap allows
  });
  it("a clear frame keeps the ordinary slot", () => {
    const r = placeBeaconLeastCovering("below", 180, frame, [], []);
    expect(r.y).toBe(frame.bottom - 6 - BEACON_H);
  });
});
