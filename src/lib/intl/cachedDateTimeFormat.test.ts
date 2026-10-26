import { describe, expect, it } from "vitest";
import { cachedDateTimeFormat } from "./cachedDateTimeFormat";

describe("cachedDateTimeFormat", () => {
  it("the same shape returns the same formatter and the same string as a fresh one", () => {
    const o: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" };
    expect(cachedDateTimeFormat("en-US", o)).toBe(cachedDateTimeFormat("en-US", { ...o }));
    const d = new Date(Date.UTC(2026, 9, 26, 14, 5));
    expect(cachedDateTimeFormat("en-US", o).format(d)).toBe(new Intl.DateTimeFormat("en-US", o).format(d));
  });
  it("a different shape is a different formatter", () => {
    expect(cachedDateTimeFormat("en-US", { timeZone: "UTC" })).not.toBe(cachedDateTimeFormat("en-US", { timeZone: "Asia/Tokyo" }));
  });
  it("a bad zone throws like the constructor and is not cached", () => {
    expect(() => cachedDateTimeFormat("en-US", { timeZone: "Not/AZone" })).toThrow(RangeError);
    expect(() => cachedDateTimeFormat("en-US", { timeZone: "Not/AZone" })).toThrow(RangeError);
  });
});
