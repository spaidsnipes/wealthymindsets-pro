import { describe, expect, it } from "vitest";
import { feedOnlyFrontMonth } from "./tastyFrontMonth";

describe("feed-only CME FX contracts", () => {
  it("builds the active quarterly contract for RP / RY / RF / 6L / 6Z only", () => {
    const oct18 = Date.parse("2026-10-18T23:00:00Z");
    expect(feedOnlyFrontMonth("RP", oct18)).toEqual({ symbol: "/RPZ26", streamer: "/RPZ26:XCME" });
    expect(feedOnlyFrontMonth("6Z", oct18)?.streamer).toBe("/6ZZ26:XCME");
    expect(feedOnlyFrontMonth("6E", oct18)).toBeNull();
  });
  it("rolls after the last trade day (Dec 14 2026 → H27)", () => {
    expect(feedOnlyFrontMonth("RY", Date.parse("2026-12-15T00:00:00Z"))?.symbol).toBe("/RYH27");
  });
});
