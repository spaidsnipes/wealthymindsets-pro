import { describe, expect, it } from "vitest";
import { BASELINE_MS, feedRedZone, RED_ZONE_START, type RedZoneState } from "./redZone";

const run = (s: RedZoneState, from: number, to: number, level: number) => {
  for (let t = from; t <= to; t += 500) s = feedRedZone(s, t, level);
  return s;
};

describe("red zone (loudness only, on device)", () => {
  it("learns a calm baseline before it judges anything", () => {
    const s = run(RED_ZONE_START, 0, BASELINE_MS, 0.02);
    expect(s.baseline).toBeCloseTo(0.02);
    expect(s.red).toBe(false);
  });
  it("three held bursts inside two minutes is the red zone; a short spike is not", () => {
    let s = run(RED_ZONE_START, 0, BASELINE_MS, 0.02);
    s = run(s, 21_000, 21_500, 0.2);          // 0.5 s spike — not a burst
    s = run(s, 22_000, 23_000, 0.02);
    expect(s.bursts).toHaveLength(0);
    for (const at of [30_000, 50_000, 70_000]) { s = run(s, at, at + 2_000, 0.2); s = run(s, at + 2_500, at + 4_000, 0.02); }
    expect(s.bursts).toHaveLength(3);
    expect(s.red).toBe(true);
  });
  it("cools down once the bursts age out of the window", () => {
    let s = run(RED_ZONE_START, 0, BASELINE_MS, 0.02);
    for (const at of [30_000, 50_000, 70_000]) { s = run(s, at, at + 2_000, 0.2); s = run(s, at + 2_500, at + 4_000, 0.02); }
    s = run(s, 75_000, 200_000, 0.02);
    expect(s.red).toBe(false);
  });
});
