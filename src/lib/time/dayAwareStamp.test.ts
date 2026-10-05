import { describe, expect, it } from "vitest";
import { dayAwareStamp } from "./dayAwareStamp";

describe("dayAwareStamp", () => {
  const now = new Date(2026, 9, 5, 9, 0).getTime();
  it("today: the time and its zone, no date", () => {
    const s = dayAwareStamp(new Date(2026, 9, 5, 8, 15).getTime(), now);
    expect(s).toMatch(/8:15/);
    expect(s).not.toMatch(/Oct/);
    expect(s).toMatch(/[A-Z]{2,5}|GMT/);
  });
  it("another day: the date is carried", () => {
    expect(dayAwareStamp(new Date(2026, 9, 2, 15, 42).getTime(), now)).toMatch(/Oct 2/);
  });
});
