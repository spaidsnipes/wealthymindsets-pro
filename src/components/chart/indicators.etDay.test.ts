import { afterEach, describe, expect, it, vi } from "vitest";

import { openingRangeBreakout, priorDayHighLow } from "./indicators";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

// 2026-10-05 is EDT (UTC-4): 09:30 ET = 13:30Z.
const at = (iso: string, high: number, low: number): LegacyOhlcvTuple =>
  ({ time: Date.parse(iso) / 1000, open: low, high, low, close: high, volume: 1 }) as unknown as LegacyOhlcvTuple;

describe("session indicators read New York time, not the viewer's clock", () => {
  const original = process.env.TZ;
  afterEach(() => { process.env.TZ = original; vi.useRealTimers(); });

  it("opening range is the 09:30–10:00 ET bars for a viewer in Chicago", () => {
    process.env.TZ = "America/Chicago";
    const bars = [
      at("2026-10-05T13:00:00Z", 900, 890),  // 09:00 ET pre-market
      at("2026-10-05T13:30:00Z", 110, 100),  // 09:30 ET — in the range
      at("2026-10-05T13:45:00Z", 120, 105),  // 09:45 ET — in the range
      at("2026-10-05T14:30:00Z", 500, 400),  // 10:30 ET — the old local-clock "open"
      at("2026-10-05T14:45:00Z", 130, 125),
    ];
    const { high, low } = openingRangeBreakout(bars, 30);
    expect(high[4]).toBe(120);
    expect(low[4]).toBe(100);
  });

  it("prior day groups by the New York date for a viewer in Tokyo", () => {
    process.env.TZ = "Asia/Tokyo";
    const bars = [
      at("2026-10-02T14:00:00Z", 50, 40),   // Fri 10:00 ET
      at("2026-10-02T19:00:00Z", 60, 45),   // Fri 15:00 ET
      at("2026-10-05T14:00:00Z", 70, 65),   // Mon 10:00 ET (Tokyo: 23:00 Mon)
      at("2026-10-05T16:00:00Z", 75, 66),   // Mon 12:00 ET (Tokyo: 01:00 Tue — a new LOCAL day)
    ];
    const { high, low } = priorDayHighLow(bars);
    // Both Monday bars see Friday's range; the Tokyo midnight is not a day break.
    expect([high[2], high[3]]).toEqual([60, 60]);
    expect([low[2], low[3]]).toEqual([40, 40]);
  });
});
