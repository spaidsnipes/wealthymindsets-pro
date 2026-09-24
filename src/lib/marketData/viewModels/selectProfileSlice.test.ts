import { describe, expect, it } from "vitest";

import selectProfileSlice from "./selectProfileSlice";
import type { LivingProfileGlass } from "./selectLivingProfileGlass";

const glass = (over: Partial<Extract<LivingProfileGlass, { drawn: true }>> = {}): LivingProfileGlass => ({
  drawn: true,
  reason: "DRAWN",
  marks: [],
  bars: [
    { price: 100.0, share: 0.3, volume: 0.3 * 1000, insideValueArea: false, isPoc: false, node: null },
    { price: 100.1, share: 1, volume: 1 * 1000, insideValueArea: true, isPoc: true, node: null },
    { price: 100.2, share: 0.6, volume: 0.6 * 1000, insideValueArea: true, isPoc: false, node: null },
    // 100.3 untraded — absent
    { price: 100.4, share: 0.2, volume: 0.2 * 1000, insideValueArea: false, isPoc: false, node: null },
  ],
  poc: 100.1,
  vah: 100.2,
  val: 100.1,
  untradedCount: 0,
  estimated: true,
  nodesWithheld: "CANDLE_ESTIMATED",
  ...over,
});

describe("selectProfileSlice", () => {
  it("resolves a click to the bucket whose range contains it", () => {
    const r = selectProfileSlice(glass(), 100.23);
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.price).toBe(100.2);
    expect(r.priceHigh).toBeCloseTo(100.3, 9);
    expect(r.shareOfPoc).toBe(0.6);
    expect(r.location).toBe("IN_VALUE");
    expect(r.distanceFromPoc).toBeCloseTo(0.1, 9);
    expect(r.estimated).toBe(true);
    expect(r.nodesWithheld).toBe("CANDLE_ESTIMATED");
  });

  it("names the POC bucket as POC", () => {
    const r = selectProfileSlice(glass(), 100.1);
    expect(r.found && r.isPoc).toBe(true);
  });

  it("locates buckets above and below value without calling a side", () => {
    const above = selectProfileSlice(glass(), 100.45);
    const below = selectProfileSlice(glass(), 100.05);
    expect(above.found && above.location).toBe("ABOVE_VALUE");
    expect(below.found && below.location).toBe("BELOW_VALUE");
  });

  it("an untraded price resolves to nothing — no bucket is invented", () => {
    expect(selectProfileSlice(glass(), 100.35)).toEqual({ found: false, miss: "NO_TRADED_BUCKET_AT_PRICE" });
    expect(selectProfileSlice(glass(), 99)).toEqual({ found: false, miss: "NO_TRADED_BUCKET_AT_PRICE" });
  });

  it("no drawn profile, no slice", () => {
    expect(selectProfileSlice(null, 100.1)).toEqual({ found: false, miss: "NO_PROFILE" });
    expect(selectProfileSlice(glass({ bars: [] }), 100.1)).toEqual({ found: false, miss: "NO_PROFILE" });
  });
});
