/**
 * THE SESSION PROFILE CLIPS TO THE MARKET'S SESSION — one owner names it.
 *
 * H-601: "SESSION PROFILE must clip to an actual session definition. No
 * arbitrary visual crop." The chart used to cut every non-equity at ET
 * midnight (splitting each Globex session in two) and ignored its own Extended
 * Hours mode for equities. `sessionWindowFor` / `selectSessionWindowBars`
 * (src/lib/marketData/sessionWindow.ts) own the definition; the canvas and the
 * Profiles door both ask it, with the same inputs.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));

const CHART = read("src/components/chart/MainChart.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

const SELECT = (() => {
  const a = CHART.indexOf("const selectSessionBars = (allBars: LegacyOhlcvTuple[]): LegacyOhlcvTuple[] => {");
  const b = CHART.indexOf("const draw = () => {", a);
  return a >= 0 && b > a ? CHART.slice(a, b) : "";
})();

describe("the Session Profile clips to the market's session", () => {
  it("the scan found the canvas's session selection", () => {
    expect(SELECT.length, "selectSessionBars not found").toBeGreaterThan(100);
  });

  it("the canvas asks the one session owner, and keeps no private day-cutter", () => {
    expect(CHART).toContain("const sessionWin = sessionWindowFor(symbol, timeframe, !!extendedHours);");
    expect(SELECT).toContain("selectSessionWindowBars(allBars, sessionWin)");
    expect(SELECT).not.toMatch(/America\/New_York/);
    expect(SELECT).not.toMatch(/minute >= 570/);
  });

  it("the glass names which definition it drew, and withdraws it when Session is off", () => {
    expect(CHART).toContain("canvasRef.current.dataset.vpSessionWindow = sessionWin.kind;");
    expect(CHART).toContain("delete canvasRef.current.dataset.vpSessionWindow;");
  });

  it("the Profiles door names the same session, from the same owner and inputs", () => {
    expect(ROOM).toContain("stateDetail={{ SESSION: sessionWindowFor(symbol, timeframe, !!extHours).label }}");
    expect(ROOM).toContain("extendedHours={extHours}");
  });
});
