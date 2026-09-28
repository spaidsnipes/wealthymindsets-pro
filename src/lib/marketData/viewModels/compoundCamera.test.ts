import { describe, expect, it } from "vitest";
import { cameraArms, camerasInForce, composeCamera } from "./selectChartArrangement";

describe("compound camera — one market, one camera, many senses", () => {
  it("composing Order Flow onto Regime switches NOTHING off (the anti-mutex law)", () => {
    const regime: Record<string, boolean> = {};
    for (const a of cameraArms("REGIME")) regime[a] = true;
    regime.EFFORT_MARK = false;
    const both = composeCamera(regime, "ORDER_FLOW");
    for (const a of cameraArms("REGIME")) expect(both[a], a).toBe(true);
    for (const a of cameraArms("ORDER_FLOW")) expect(both[a], a).toBe(true);
    expect(both.EFFORT_MARK).toBe(false);
    expect(camerasInForce(both).sort()).toEqual(["ORDER_FLOW", "REGIME"]);
  });
  it("a camera is in force only when ALL its senses are on; Clean is never 'in force' as a sense", () => {
    const partial: Record<string, boolean> = { FIXED_RANGE: true, SESSION: true };
    expect(camerasInForce(partial)).not.toContain("REGIME");
    expect(camerasInForce({})).toEqual([]);
    expect(camerasInForce(null)).toEqual([]);
  });
});
