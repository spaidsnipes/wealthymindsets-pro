import { describe, expect, it } from "vitest";
import { withholdUntradedOutliers } from "./untradedOutlierBars";

const bar = (i: number, lo: number, hi: number, v: number) => ({ time: 1_790_000_000 + i * 300, open: lo, high: hi, low: lo, close: hi, volume: v });
const traded = Array.from({ length: 30 }, (_, i) => bar(i, 372, 373, 1000));

describe("untraded outlier bars", () => {
  it("the TSLA case: a zero-volume after-hours bar ranging 26 points is withheld, by time", () => {
    const bad = bar(30, 346.5, 372.2, 0);
    const r = withholdUntradedOutliers([...traded, bad, bar(31, 372, 372.4, 0)]);
    expect(r.withheld).toEqual([bad.time]);
    expect(r.kept).toHaveLength(31);
  });
  it("a zero-volume bar with a normal range is kept (a quiet bar is not a lie)", () => {
    expect(withholdUntradedOutliers([...traded, bar(30, 372, 373, 0)]).withheld).toEqual([]);
  });
  it("a feed that does not report volume is never judged (chartBarRangeFact's caution)", () => {
    const noVol = Array.from({ length: 30 }, (_, i) => bar(i, 1.1, 1.1 + (i === 15 ? 0.2 : 0.001), 0));
    expect(withholdUntradedOutliers(noVol).withheld).toEqual([]);
  });
  it("a traded bar is never withheld, however wide", () => {
    expect(withholdUntradedOutliers([...traded, bar(30, 340, 380, 50_000)]).withheld).toEqual([]);
  });
});
