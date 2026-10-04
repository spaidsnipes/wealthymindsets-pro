import { describe, expect, it } from "vitest";
import { catalogueMinutes, durationMinutes, formatHoursMinutes } from "./catalogueMinutes";

describe("catalogue time", () => {
  it("reads the label shapes the Academy uses", () => {
    expect(durationMinutes("4h 20m")).toBe(260);
    expect(durationMinutes("4h")).toBe(240);
    expect(durationMinutes("18m")).toBe(18);
    expect(durationMinutes("soon")).toBeNull();
    expect(durationMinutes("")).toBeNull();
  });
  it("sums the module durations instead of a typed 40h+", () => {
    const total = catalogueMinutes(["4h 20m", "5h 45m", "6h 10m", "3h 30m", "4h", "5h 20m", "3h", "2h"]);
    expect(total).toBe(34 * 60 + 5);
    expect(formatHoursMinutes(total!)).toBe("34h 05m");
  });
});
