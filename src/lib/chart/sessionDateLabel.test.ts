import { describe, expect, it } from "vitest";
import { fmtSessionDate, isSessionTimeframe, sessionDateZone } from "./sessionDateLabel";

// 2026-08-11 00:00 America/New_York (EDT) = 04:00Z.
const AUG11_ET = Date.UTC(2026, 7, 11, 4, 0, 0) / 1000;
// 2025-12-01 00:00 America/New_York (EST) = 05:00Z.
const DEC1_ET = Date.UTC(2025, 11, 1, 5, 0, 0) / 1000;
const AUG11_UTC = Date.UTC(2026, 7, 11, 0, 0, 0) / 1000;

describe("daily bars print their session date (serving TSLA 1D, 2026-09-28)", () => {
  it("an ET-midnight stamp reads as that ET date for a Chicago trader, not the evening before", () => {
    expect(sessionDateZone(AUG11_ET, "America/Chicago")).toBe("America/New_York");
    expect(fmtSessionDate(AUG11_ET, "America/Chicago")).toBe("Aug 11");
    expect(fmtSessionDate(DEC1_ET, "America/Chicago", { year: "numeric", month: "short" })).toBe("Dec 2025");
  });
  it("a UTC-midnight crypto daily reads as its UTC date", () => {
    expect(sessionDateZone(AUG11_UTC, "America/Chicago")).toBe("UTC");
    expect(fmtSessionDate(AUG11_UTC, "America/Los_Angeles")).toBe("Aug 11");
  });
  it("a stamp that is midnight nowhere known keeps the trader's zone", () => {
    const t = Date.UTC(2026, 7, 11, 13, 30) / 1000;
    expect(sessionDateZone(t, "America/Chicago")).toBe("America/Chicago");
  });
  it("only daily-and-longer timeframes are session timeframes", () => {
    for (const tf of ["1D", "1W", "1M"]) expect(isSessionTimeframe(tf)).toBe(true);
    for (const tf of ["1m", "4h", "1h", null]) expect(isSessionTimeframe(tf)).toBe(false);
  });
});

import { readFileSync } from "node:fs";
describe("every daily-bar time reader goes through the one owner", () => {
  it("axis + crosshair (MainChart), data window heading, feed recency header", () => {
    const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(MC).toContain("if (sessionTfRef.current) return fmtSessionDate(sec, tzRef.current,");
    expect(MC).toContain("if (sessionTfRef.current) {");
    expect(readFileSync("src/lib/chart/dataWindowBarScope.ts", "utf8")).toContain("if (isSessionTimeframe(timeframe)) {");
    expect(readFileSync("src/lib/chart/chartFeedRecency.ts", "utf8")).toContain("const clock = interval >= 86_400");
  });
});
