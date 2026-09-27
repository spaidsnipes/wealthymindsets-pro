/**
 * Garden 16 emergency order §15 — WAIT IS A MARKET POSTURE, NOT A CARD.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAYER_ATTENTION, POSTURE_QUIET, selectAttentionGovernor } from "./selectAttentionGovernor";

const base = (posture: "QUIET" | null) => selectAttentionGovernor({
  density: { depth: "MID" } as never,
  questionQuiet: 1,
  regimeLight: null,
  stackPrefs: {} as never,
  feedState: "LIVE" as never,
  posture,
});

describe("the governor quiets the room while it waits", () => {
  it("SUPPORTING layers step back by POSTURE_QUIET; the receipt names the posture", () => {
    const open = base(null), quiet = base("QUIET");
    const k = "derivativesPressure" as const;
    expect(quiet.alpha(k)).toBeCloseTo(Math.max(open.alpha(k) * POSTURE_QUIET, 0), 5);
    expect(quiet.receipt).toContain("|POSTURE:QUIET");
    expect(open.receipt).not.toContain("POSTURE");
  });
  it("the present keeps its strength: LIVE and CHROME tiers are untouched, and a selected item too", () => {
    const open = base(null), quiet = base("QUIET");
    const live = (Object.keys(LAYER_ATTENTION) as (keyof typeof LAYER_ATTENTION)[]).filter(k => (LAYER_ATTENTION[k].tier === "LIVE" || LAYER_ATTENTION[k].tier === "CHROME") && !("lane" in LAYER_ATTENTION[k] && (LAYER_ATTENTION[k] as { lane?: unknown }).lane));
    expect(live.length).toBeGreaterThan(0);
    for (const k of live) expect(quiet.alpha(k)).toBe(open.alpha(k));
    expect(quiet.alpha("derivativesPressure", { selectedItem: true })).toBe(open.alpha("derivativesPressure", { selectedItem: true }));
  });
});

describe("the room derives the posture from the ONE compiled decision; the canvas shows it", () => {
  const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("WAIT / NO TRADE → QUIET", () => {
    expect(CD).toContain('roomPosture={chartCanvasVM.oneStory?.decision?.value === "WAIT" || chartCanvasVM.oneStory?.decision?.value === "NO TRADE" ? "QUIET" : null}');
    expect(MC).toContain("posture: roomPostureRef.current,");
  });
  it("the quiet edge is painted first in the frame, and never reaches the centre", () => {
    // After the glass clear and its hit-list resets, before any layer paints.
    const resets = MC.indexOf("memoryGhostHitRef.current = null;");
    const vig = MC.indexOf("WAIT IS A POSTURE, NOT A CARD");
    expect(vig).toBeGreaterThan(resets);
    expect(vig - resets).toBeLessThan(120);
    expect(MC).toContain('vig.addColorStop(0, "rgba(4,5,8,0)");');
    expect(MC).toContain("canvas.dataset.roomPosture = roomPostureRef.current ?? \"OPEN\";");
  });
});
