import { describe, expect, it } from "vitest";
import { clipOutChips } from "./clipOutChips";

const fake = () => {
  const calls: string[] = [];
  return {
    calls,
    ctx: {
      beginPath: () => calls.push("begin"),
      rect: (x: number, y: number, w: number, h: number) => calls.push(`rect ${x},${y},${w},${h}`),
      clip: (rule?: string) => calls.push(`clip ${rule}`),
    } as never,
  };
};

describe("clipOutChips", () => {
  it("cuts one evenodd clip per chip, padded", () => {
    const f = fake();
    expect(clipOutChips(f.ctx, 100, 50, [{ x: 10, y: 10, w: 20, h: 8 }, { x: 40, y: 5, w: 5, h: 5 }])).toBe(2);
    expect(f.calls).toEqual([
      "begin", "rect 0,0,100,50", "rect 9,9,22,10", "clip evenodd",
      "begin", "rect 0,0,100,50", "rect 39,4,7,7", "clip evenodd",
    ]);
  });
  it("leaves the line's own plate drawable", () => {
    const f = fake();
    const own = { x: 1, y: 2, w: 3, h: 4 };
    expect(clipOutChips(f.ctx, 100, 50, [{ ...own }, { x: 50, y: 5, w: 5, h: 5 }], own)).toBe(1);
  });
  it("no chips, no clip", () => {
    const f = fake();
    expect(clipOutChips(f.ctx, 100, 50, [])).toBe(0);
    expect(f.calls).toEqual([]);
  });
});
