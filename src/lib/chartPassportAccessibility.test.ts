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

  it("binds the trigger to the drawer and keeps its tap target usable", () => {
    expect(dashboard).toContain('aria-controls="chart-market-object-passport"');
    expect(dashboard).toContain("fallbackTriggerRef={passportTriggerRef}");
    expect(dashboard).toContain("minHeight: 44");
    expect(dashboard).not.toContain("height: 28,");
  });

  it("inherits Escape, focus containment, and focus restoration", () => {
    expect(drawer).toContain("useShellModalFocus");
    expect(drawer).toContain("onKeyDown={onKeyDown}");
    expect(drawer).toContain("initialFocusRef: closeRef");
  });
});
