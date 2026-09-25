/**
 * THE FOOTPRINT PUBLISHES WHAT IT PAINTED — O-06.
 *
 * The desktop certificate (2026-09-25) found footprint modes publish no `ds`
 * receipt, so serving could never prove a footprint row. Every mode now asks
 * for a bar's rows through ONE counter and the frame publishes the count:
 * OFF when switched off, `<mode>:NO_EXECUTIONS` when on with nothing heard,
 * else the mode, bars, rows and the row order (high first).
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("footprint receipt", () => {
  it("every footprint mode reads its rows through the one counter", () => {
    expect(CHART).not.toMatch(/const levels = getBarFootprint\(c, (numLevels|numLev)\)/);
    expect(CHART.match(/const levels = fpLevels\(c, (numLevels|numLev)\)\.reverse\(\);/g)?.length).toBe(5);
  });

  it("counts only bars that returned rows", () => {
    expect(CHART).toMatch(/if \(rows\.length > 0\) \{ fpBarsPainted\+\+; fpRowsPainted \+= rows\.length; \}/);
  });

  it("names OFF, silence, and paint as three different states, withdrawing stale counts", () => {
    expect(CHART).toMatch(/dsFp\.footprint = "OFF";/);
    expect(CHART).toMatch(/dsFp\.footprint = `\$\{effectiveFP\}:NO_EXECUTIONS`;/);
    expect(CHART).toMatch(/dsFp\.footprintRows = String\(fpRowsPainted\);/);
    expect(CHART.match(/delete dsFp\.footprintBars; delete dsFp\.footprintRows; delete dsFp\.footprintOrder;/g)?.length).toBe(2);
  });
});
