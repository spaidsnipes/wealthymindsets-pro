import { describe, expect, it } from "vitest";
import { localDayKey } from "./localDayKey";

describe("localDayKey", () => {
  it("reads the local calendar day, not the UTC one", () => {
    const d = new Date(2026, 9, 3, 23, 30); // 3 Oct, 11:30 PM local
    expect(localDayKey(d)).toBe("2026-10-03");
  });
  it("pads month and day", () => {
    expect(localDayKey(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
  });
});
