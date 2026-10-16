import { describe, expect, it } from "vitest";
import { MIN_BARS, wheelZoomRange } from "./wheelZoom";

const opts = { lastIndex: 199, cursorLogical: 150, totalBars: 200 };

describe("L8 · wheel zoom", () => {
  it("keeps the right edge pinned while the live bar is on camera, wherever the cursor is", () => {
    const r = wheelZoomRange({ from: 140, to: 204 }, -1000, opts);
    expect(r.to).toBe(204);
    expect(r.to - r.from).toBeLessThan(64 * 0.75);
  });
  it("is about 4× the library's pace: 10 notches ≈ 41%", () => {
    const r = wheelZoomRange({ from: 100, to: 204 }, 1000, opts);
    expect((r.to - r.from) / 104).toBeCloseTo(Math.pow(1.035, 10), 5);
  });
  it("holds the bar under the cursor when the live bar is off camera", () => {
    const r = wheelZoomRange({ from: 100, to: 160 }, -500, { ...opts, cursorLogical: 130 });
    const fBefore = (130 - 100) / 60, fAfter = (130 - r.from) / (r.to - r.from);
    expect(fAfter).toBeCloseTo(fBefore, 6);
  });
  it("never fewer than the minimum, never beyond every bar plus a margin", () => {
    expect(wheelZoomRange({ from: 195, to: 204 }, -100000, opts).to - wheelZoomRange({ from: 195, to: 204 }, -100000, opts).from).toBe(MIN_BARS);
    const out = wheelZoomRange({ from: 0, to: 204 }, 100000, opts);
    expect(out.to - out.from).toBe(250);
  });
});
