import { describe, expect, it } from "vitest";
import { bucketStep, profileContribution, type ContributionBar } from "./profileContribution";

const bar = (time: number, low: number, high: number, volume: number, tape: [number, number, number][] | null = null): ContributionBar =>
  ({ time, low, high, volume, tape: tape ? new Map(tape.map(([p, b, a]) => [p, { bid: b, ask: a }])) : null });

describe("profile × candle (#14)", () => {
  it("finds the bucket step from the profile's own edges", () => {
    expect(bucketStep([100, 100.25, 100.5, 101])).toBe(0.25);
    expect(bucketStep([100])).toBeNull();
  });

  it("TAPE: lights only bars whose prints traded inside the bucket", () => {
    const c = profileContribution(100, 0.25, [
      bar(1, 99, 101, 10, [[100.1, 3, 2], [100.5, 9, 9]]),
      bar(2, 99, 101, 10, [[99.5, 4, 4]]),
      bar(3, 99, 101, 10, null),
    ], "TAPE");
    expect(c).toEqual([{ time: 1, volume: 5, share: 1 }]);
  });

  it("ESTIMATED: a bar's share is its range overlap with the bucket, as the candle profile spreads it", () => {
    const c = profileContribution(100, 1, [bar(1, 99, 101, 10), bar(2, 100.5, 102.5, 20), bar(3, 105, 106, 50)], "ESTIMATED");
    expect(c.map(x => x.time)).toEqual([1, 2]);
    expect(c[0].volume).toBeCloseTo(5);
    expect(c[1].volume).toBeCloseTo(5);
  });
});
