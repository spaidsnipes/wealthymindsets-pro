/**
 * NO VOLUME EVIDENCE, NO EFFORT CLAIM — Garden 16 §27.
 *
 * Found on serving (2026-09-27, /charts?symbol=EURUSD&tf=15m, after dd0ea291
 * silenced the volume pane): the absorption layer still printed its basis as
 * "EFFORT · VOLUME". Spot FX has no centralised volume; the effort it weighed
 * was the feed's 0/1 placeholders. Both effort readers now take the one volume
 * gate (volumeTruth.ts).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectAbsorptionAnatomy } from "@/lib/marketData/selectAbsorptionAnatomy";
import { selectEffortVsResult } from "@/lib/marketData/viewModels/selectEffortVsResult";

const read = (p: string) => readFileSync(p, "utf8");

describe("effort readers read the volume gate", () => {
  it("absorption over zero-effort bars is UNMEASURED, never EFFORT · VOLUME", () => {
    const bars = Array.from({ length: 40 }, (_, i) => ({
      time: 1_790_000_000 + i * 900, open: 1.139 + i * 1e-5, high: 1.1392 + i * 1e-5,
      low: 1.1388 + i * 1e-5, close: 1.1391 + i * 1e-5, volume: 0, askVol: null, bidVol: null,
    }));
    expect(selectAbsorptionAnatomy(bars, { windowBars: 40 }).basis).toBe("UNMEASURED");
  });

  it("effort vs result with no volume reads nothing", () => {
    const prior = Array.from({ length: 50 }, (_, i) => ({ volume: null, open: 1 + i * 1e-4, close: 1.0002 + i * 1e-4 }));
    const vm = selectEffortVsResult({ bar: { volume: null, open: 1.01, close: 1.012 }, priorBars: prior });
    expect(vm.effortRatio).toBeNull();
  });

  it("MainChart's absorption input and the room's effort inputs pass through the gate", () => {
    const mc = read("src/components/chart/MainChart.tsx");
    expect(mc).toContain("const effortIsReal = volumeTruthFor(symbol, srcBars).real;");
    expect(mc).toContain("volume: effortIsReal && Number.isFinite(b.volume) ? b.volume : 0,");
    const cd = read("src/components/chart/ChartsDashboard.tsx");
    expect(cd).toContain("volume: volumeIsReal ? b.volume : null, open: b.open, close: b.close,");
    expect(cd).toContain("volume: volumeIsReal ? effortSubjectBar.v : null, open: effortSubjectBar.o");
  });

  it("the volume footer starts clear of the W badge and a silence reads as a refusal", () => {
    const mc = read("src/components/chart/MainChart.tsx");
    const at = mc.indexOf('"wm-chart-volume-footer font-mono"');
    expect(at).toBeGreaterThan(0);
    const block = mc.slice(at, at + 1400);
    expect(block).toMatch(/left: 30,/);
    expect(mc).toMatch(/position: "absolute", bottom: 6, left: 6,[\s\S]{0,200}<svg width="18"/);
    expect(read("src/app/globals.css")).toContain('.wm-chart-volume-footer[data-volume-state="SILENT"]');
  });

  it("the footer's rules apply on desktop — not inside a phone-only media block", () => {
    const css = read("src/app/globals.css");
    const at = css.indexOf(".wm-chart-volume-footer {");
    expect(at).toBeGreaterThan(0);
    let depth = 0;
    for (let i = 0; i < at; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    // Inside @layer (depth 1) is fine; inside a @media within it is not.
    const before = css.slice(0, at);
    const lastMedia = before.lastIndexOf("@media");
    const closedSince = lastMedia < 0 ? true : (() => { let d = 0; for (let i = before.indexOf("{", lastMedia); i < at; i++) { if (css[i] === "{") d++; else if (css[i] === "}") d--; if (d === 0) return true; } return false; })();
    expect(closedSince, "footer rule is nested in a @media block").toBe(true);
    expect(depth).toBeLessThanOrEqual(1);
  });
});
