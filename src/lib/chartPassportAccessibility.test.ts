import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const drawer = readFileSync(resolve(process.cwd(), "src/components/layout/ShellModalDrawer.tsx"), "utf8");

describe("chart Market Object Passport transformation", () => {
  it("uses the shared responsive modal owner instead of a narrow desktop-only overlay", () => {
    expect(dashboard).toContain("<ShellModalDrawer");
    expect(dashboard).not.toContain('maxWidth: "42vw"');
    expect(drawer).toContain("max-w-[100vw]");
    expect(drawer).toContain("aria-modal=\"true\"");
  });

  it("keeps lineage inside WHY with a native keyboard-operable disclosure", () => {
    const start = dashboard.indexOf('id="chart-decision-why"');
    const end = dashboard.indexOf("{/* ── Toolbar", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const why = dashboard.slice(start, end);
    expect(why).toContain("fallbackTriggerRef={whyTriggerRef}");
    expect(why).toContain('<details className="mt-3 border-t border-wm-border" id="chart-market-object-passport"');
    expect(why).toContain('<summary className="min-h-11');
    expect(why).toContain("<MarketObjectPassportPanel vm={chartPassportVM} />");
    expect(why).toContain('key={`${symbol}:${timeframe}`}');
    expect(dashboard).not.toContain("passportOpen");
    expect(dashboard).toContain("minHeight: 44");
    expect(dashboard).not.toContain("height: 28,");
  });

  it("inherits Escape, focus containment, and focus restoration", () => {
    expect(drawer).toContain("useShellModalFocus");
    expect(drawer).toContain("onKeyDown={onKeyDown}");
    expect(drawer).toContain("initialFocusRef: closeRef");
    const focus = readFileSync(resolve(process.cwd(), "src/components/layout/useShellModalFocus.ts"), "utf8");
    expect(focus).toContain('"summary"');
  });
});
