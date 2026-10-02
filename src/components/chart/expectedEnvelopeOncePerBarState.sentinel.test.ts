import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");

describe("Expected Envelope is computed once per bar state, not per frame (2026-10-01)", () => {
  it("the selector runs only when the bars' key changed, and the room hears only changes", () => {
    expect(CHART).toContain("if (envChanged) envCacheRef.current = { key: envKey, env: selectExpectedEnvelope(barsE, keyE) };");
    expect(CHART).toContain("if (envChanged) onExpectedEnvelopeRef.current?.(env);");
    expect(CHART.match(/selectExpectedEnvelope\(/g)?.length).toBe(1);
  });
  it("Memory Ghost too", () => {
    expect(CHART).toContain("if (ghostChanged) ghostCacheRef.current = { key: ghostKey, ghost: selectMemoryGhost(ghostBars) };");
    expect(CHART).toContain("if (ghostChanged) onMemoryGhostRef.current?.(ghost);");
  });
});
