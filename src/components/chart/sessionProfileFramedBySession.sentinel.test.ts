/**
 * SESSION PROFILE IS FRAMED BY ITS SESSION — GP12 Defect 1 / Defect 2.
 *
 * Found on serving (NQ1! 5m desktop, 2026-09-25): the Session and Fixed
 * columns were one histogram in two inks — hide the words and nothing said
 * which stretch of time either measured. Canon: "SESSION PROFILE must clip to
 * an actual session definition. No arbitrary visual crop."
 *
 * The law now: only the Session column draws a frame — a wall at the
 * session's opening bar and hairlines at the session high/low running to the
 * column — from the session owner's bars; it publishes `vpSpan` and withdraws
 * it every frame. A breadcrumb, not a renderer. It reads source.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

describe("Session profile is framed by its session (Sentinel)", () => {
  const at = CHART.indexOf('if (span === "SESSION") {');
  const block = CHART.slice(at, at + 2200);

  it("only the Session column asks for a frame", () => {
    expect(at).toBeGreaterThan(-1);
    expect(CHART).toContain('drawWMVP(sessionBars, "#8B5CF6", "WM Session VP", 0, bothVP ? 1 : 0, nVPCols, 0.6, "SESSION")');
    expect(CHART).toContain('drawWMVP(allBars, "#F0B429", "WM Fixed VP", 0, 0, nVPCols)');
  });

  it("the frame is the session's own bars: opening bar time, session high and low", () => {
    expect(block).toContain("timeToCoordinate(barsToUse[0].time as never)");
    expect(block).toContain("yOf(priceRange.hi)");
    expect(block).toContain("yOf(priceRange.lo)");
    // The session bars come from the one session owner.
    expect(CHART).toContain("const sessionBars = selectSessionBars(allBars);");
    expect(CHART).toContain("selectSessionWindowBars(allBars, sessionWin)");
  });

  it("draws strokes only — no box over the candles — and says what it drew", () => {
    expect(block).not.toMatch(/fillRect\(/);
    expect(block).toContain("ctx.stroke()");
    expect(block).toContain('`OPEN:${Math.round(x0)}` : "OPENED_BEFORE_VIEW"');
    expect(CHART).toContain("if (canvasRef.current) delete canvasRef.current.dataset.vpSpan;");
  });
});
