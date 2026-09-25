/**
 * THE SAVED RTH / ETH CHOICE SURVIVES A RELOAD (F24 audit · Session).
 *
 * The room saves the session mode (wm_extHours, default ETH) and feeds the
 * chart, the canonical session and the Session Profile's label. The Tools
 * drawer's select kept its OWN copy starting at RTH and pushed it up in an
 * effect on mount — every time the chart loaded, the saved choice was
 * overwritten with RTH. The select is now controlled by the room's value and
 * reports only the trader's own change.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));
const TOOLBAR = read("src/components/chart/ChartToolbar.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

describe("the saved session mode survives a reload", () => {
  it("the toolbar never pushes its own session value on mount", () => {
    expect(TOOLBAR).not.toMatch(/useEffect\(\(\) => \{ onExtHoursChange\?\.\(extendedHours\); \}/);
    expect(TOOLBAR).toContain("const extendedHours = extendedHoursValue ?? extendedHoursLocal;");
  });

  it("the room hands the toolbar its saved value", () => {
    expect(ROOM).toContain("extendedHoursValue={extHours}");
    expect(ROOM).toMatch(/lsGet\("wm_extHours", true\)/);
  });
});
