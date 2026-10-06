import { describe, expect, it } from "vitest";
import { inspectedBarMark, INSPECT_HAIRLINE_GAP, INSPECT_RULE_BARS } from "./inspectedBarMark";

const plot = { x0: 0, x1: 1270, y0: 120, y1: 660 };

describe("F05B — the selected candle is marked on the chart (plate beside serving NQ1! 5m)", () => {
  it("a hairline above and below the candle, never across it; ceiling and floor at its own high and low", () => {
    const m = inspectedBarMark({ x: 1200, yHigh: 200, yLow: 260, barSpacing: 8, plot })!;
    expect(m.hairline).toEqual([
      { x: 1200, y0: 120, y1: 200 - INSPECT_HAIRLINE_GAP },
      { x: 1200, y0: 260 + INSPECT_HAIRLINE_GAP, y1: 660 },
    ]);
    expect(m.ceiling.y).toBe(200);
    expect(m.floor.y).toBe(260);
    expect(m.ceiling.x1 - m.ceiling.x0).toBe(2 * 8 * INSPECT_RULE_BARS);
  });
  it("rules stop at the plot's edges", () => {
    const m = inspectedBarMark({ x: 1265, yHigh: 200, yLow: 260, barSpacing: 8, plot })!;
    expect(m.ceiling.x1).toBe(1270);
  });
  it("a candle off the camera, or an unmeasured coordinate, is not marked", () => {
    expect(inspectedBarMark({ x: 1300, yHigh: 200, yLow: 260, barSpacing: 8, plot })).toBeNull();
    expect(inspectedBarMark({ x: 100, yHigh: NaN, yLow: 260, barSpacing: 8, plot })).toBeNull();
  });
  it("a candle touching the pane's top keeps only the lower hairline", () => {
    const m = inspectedBarMark({ x: 600, yHigh: 122, yLow: 300, barSpacing: 8, plot })!;
    expect(m.hairline).toHaveLength(1);
  });
});
