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
});
