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
  // 2026-09-25 (footprint canon): three modes paint rows (Bid × Ask cells,
  // the Volume Profile histogram, Imbalance tint); the trail modes (Delta
  // Bubbles, Agg/Passive) and Big Trades paint rings, and count those instead.
  it("every ROW mode reads its rows through the one counter", () => {
    expect(CHART).not.toMatch(/const levels = getBarFootprint\(c, (numLevels|numLev)\)/);
    expect(CHART.match(/const levels = fpLevels\(c, (numLevels|numLev)\)\.reverse\(\);/g)?.length).toBe(3);
  });

  // 2026-09-25: an untraded row is left BLANK on the glass (M46), so it is not
  // a painted row — the counter counts rows that traded, and a bar only when
  // one did.
  it("counts only bars, and rows, that traded", () => {
    expect(CHART).toMatch(/const heard = rows\.reduce\(\(k, r\) => k \+ \(r\.total > 0 \? 1 : 0\), 0\);/);
    expect(CHART).toMatch(/if \(heard > 0\) \{ fpBarsPainted\+\+; fpRowsPainted \+= heard; \}/);
  });

  it("the ring modes count the bars and rings that reached the glass, and say which form painted", () => {
    expect(CHART).toContain("fpTrailBars.add(b.anchorBarTime);");
    expect(CHART).toContain("fpTrailBars.add(r.bar);");
    expect(CHART).toContain("const fpBars = fpBarsPainted + fpTrailBars.size;");
    expect(CHART).toContain("dsFp.footprintForm = FOOTPRINT_FORM[effectiveFP];");
    expect(CHART).toContain("if (fpRings > 0) dsFp.footprintRings = String(fpRings);");
  });

  it("publishes after Big Trades has painted — never `big-trades:NO_EXECUTIONS` over a glass of bubbles", () => {
    const receipt = CHART.indexOf("const fpBars = fpBarsPainted + fpTrailBars.size;");
    const bigOff = CHART.indexOf("// Left big-trades mode");
    expect(bigOff).toBeGreaterThan(-1);
    expect(receipt).toBeGreaterThan(bigOff);
    expect(CHART).toContain("fpRings += bigDrawn + bubblesQuieted;");
  });

  it("names OFF, silence, and paint as three different states, withdrawing stale counts", () => {
    expect(CHART).toMatch(/dsFp\.footprint = "OFF";/);
    expect(CHART).toMatch(/dsFp\.footprint = `\$\{effectiveFP\}:NO_EXECUTIONS`;/);
    expect(CHART).toMatch(/dsFp\.footprintRows = String\(fpRowsPainted\);/);
    expect(CHART.match(/delete dsFp\.footprintBars; delete dsFp\.footprintRows; delete dsFp\.footprintOrder;/g)?.length).toBe(2);
  });
});
