import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("a quiet quote newer than the bars keeps the header (TSLA overnight, 2026-10-02)", () => {
  it("only a quote OLDER than the newest bar yields to the bar close", () => {
    expect(CHART).toContain("|| (newestBarOpenMs != null && Number.isFinite(newestBarOpenMs) && lastObservedAtMs >= newestBarOpenMs)");
    expect(CHART).toContain("Date.now() - lastObservedAtMs < HEADER_LIVE_FRESH_MS");
  });
});
