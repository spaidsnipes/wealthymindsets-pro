/**
 * A PLAN SITS ON THE TICK GRID; A STOCK QUOTES IN CENTS — Garden 16, 2026-09-26.
 *
 * Both found on the glass (local, real Webull TSLA 15m bars, Workspace › Draw ›
 * Long Position through the UI):
 *   - the plan's anchors were raw pixel prices — ENTRY 369.9904, STOP
 *     366.9931 — so the rail read "≈299.7 ticks": a stop no venue takes;
 *   - the axis, header and every level name read four decimals ("388.0000")
 *     because Webull's consolidated tape carries sub-penny executions.
 *
 * This sentinel reads source (a breadcrumb, not a renderer). It pins:
 *   - one helper (planPt) snaps Long / Short Position anchors through the
 *     economics owner's snapToTick, keyed on the chart's `symbol`;
 *   - every placement path uses it: click placement, rubber-band preview,
 *     single-anchor reshape, and a moved plan on release;
 *   - every precision read in the chart and dashboard passes the symbol, so
 *     the precision owner can apply the equity cents grid.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const CD = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("plan anchors on the instrument's tick grid", () => {
  it("planPt snaps only position tools, through the owner, keyed on symbol", () => {
    expect(MC).toMatch(/import \{ selectRiskEconomics, snapToTick \} from "@\/lib\/marketData\/contractEconomics";/);
    expect(MC).toMatch(
      /const planPt = useCallback\(\(tool: string, lp: LogicalPt\): LogicalPt =>\n\s*tool === "long-position" \|\| tool === "short-position" \? \{ \.\.\.lp, price: snapToTick\(symbol, lp\.price\) \} : lp,\n\s*\[symbol\]\);/,
    );
  });

  it("click placement snaps", () => {
    expect(MC).toMatch(/const rawLp = pixelToLogical\(x, y\) \?\? drawingStartRef\.current\?\.lp \?\? null;\n\s*const lp = rawLp && planPt\(drawingTool, rawLp\);/);
  });

  it("the rubber-band preview snaps", () => {
    expect(MC).toMatch(/if \(lp\) previewPtRef\.current = planPt\(drawingTool, lp\);/);
  });

  it("reshaping one anchor snaps", () => {
    expect(MC).toMatch(/if \(drag\.ptIdx != null\) d\.pts\[drag\.ptIdx\] = planPt\(d\.tool, lp\);/);
  });

  it("a moved plan lands on the grid on release, not mid-drag", () => {
    expect(MC).toMatch(/drawingsRef\.current\[drag\.idx\] = \{ \.\.\.d, pts: d\.pts\.map\(p => planPt\(d\.tool, p\)\) \};/);
    // Mid-drag moves stay free: snapping each small delta would pin the plan.
    expect(MC).toMatch(/else drawingsRef\.current\[drag\.idx\] = moveDrawingBy\(d, lp\.price - drag\.last\.price, lp\.time - drag\.last\.time\);/);
  });
});

describe("every precision read carries the symbol", () => {
  it("MainChart and ChartsDashboard never ask the bars alone", () => {
    for (const [name, src] of [["MainChart", MC], ["ChartsDashboard", CD]] as const) {
      const calls = [...src.matchAll(/pricePrecisionFromBars\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)].map(m => m[1]);
      expect(calls.length, `${name} has no precision reads`).toBeGreaterThan(0);
      for (const args of calls) expect(args, `${name}: pricePrecisionFromBars(${args})`).toMatch(/,\s*symbol$/);
    }
  });
});
