import { describe, expect, it } from "vitest";

import { TF_IDS } from "@/lib/timeframes";
import { getIntervalSec } from "./MainChart";

/*
 * Serving MNQ1! 5s, 2026-10-01: the registry gained 5s/15s/30s and this
 * private table did not, so the chart threw "unknown timeframe" and showed
 * "Something went wrong". Every registry id must resolve here.
 */
describe("MainChart getIntervalSec covers every registry timeframe", () => {
  it("answers a positive interval for every TFId", () => {
    expect(TF_IDS.length).toBeGreaterThan(20);
    for (const id of TF_IDS) expect(getIntervalSec(id), id).toBeGreaterThan(0);
  });

  it("the seconds clocks are their own size", () => {
    expect(getIntervalSec("5s")).toBe(5);
    expect(getIntervalSec("15s")).toBe(15);
    expect(getIntervalSec("30s")).toBe(30);
  });

  it("still refuses an id the registry does not know", () => {
    expect(() => getIntervalSec("10s")).toThrow(/unknown timeframe/);
  });
});
