import { describe, expect, it } from "vitest";
import { traderClock } from "./traderClock";

describe("trader clock — local time with its zone, never a bare UTC reading", () => {
  it("names the zone", () => {
    const s = traderClock(Date.UTC(2026, 9, 7, 17, 26, 32));
    expect(s).toMatch(/\d{1,2}:\d{2}:\d{2}\s?(AM|PM) [A-Z]{2,5}|GMT[+-]?\d*/);
    expect(s.endsWith("Z")).toBe(false);
  });
  it("can drop seconds", () => {
    expect(traderClock(Date.UTC(2026, 9, 7, 17, 26, 32), { seconds: false })).not.toMatch(/:\d{2}:\d{2}/);
  });
  it("absent or unreadable instants print a dash", () => {
    expect(traderClock(null)).toBe("—");
    expect(traderClock(NaN)).toBe("—");
  });
  it("names the day when the instant is not today (a bare clock from yesterday read as hours ahead)", () => {
    const now = Date.UTC(2026, 9, 8, 12, 47);
    const yesterday = now - 20 * 3600_000;
    expect(traderClock(yesterday, { seconds: false, nowMs: now })).toMatch(/^Oct \d{1,2}, /);
    expect(traderClock(now - 60_000, { seconds: false, nowMs: now })).not.toMatch(/^Oct/);
  });
});
