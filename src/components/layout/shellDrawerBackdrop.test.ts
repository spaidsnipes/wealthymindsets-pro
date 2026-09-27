import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SHELL_DRAWER_BACKDROP } from "./ShellModalDrawer";

describe("the Chart tools sheet keeps the market readable behind it (§9/§18/§44)", () => {
  it("clear dims lightly and never blurs; veil stays the house modal", () => {
    expect(SHELL_DRAWER_BACKDROP.clear.backdropFilter).toBeUndefined();
    expect(SHELL_DRAWER_BACKDROP.clear.background).toBe("rgba(0,0,0,0.12)");
    expect(SHELL_DRAWER_BACKDROP.veil).toEqual({ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" });
  });
  it("Chart tools asks for the clear backdrop; the drawer defaults to veil", () => {
    const tb = readFileSync(path.join(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
    const i = tb.indexOf('id="chart-equipment-sheet"');
    expect(tb.slice(i, i + 2000)).toContain('backdrop="clear"');
    const dr = readFileSync(path.join(process.cwd(), "src/components/layout/ShellModalDrawer.tsx"), "utf8");
    expect(dr).toContain('backdrop = "veil",');
    expect(dr).toContain("style={SHELL_DRAWER_BACKDROP[backdrop]}");
  });
});
