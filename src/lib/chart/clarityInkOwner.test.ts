import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CLARITY_EMPTY_FRAMES_BEFORE_RESTORE,
  CLARITY_HIDDEN_INK,
  ClarityInkOwner,
  isHiddenInk,
  settingsContentKey,
  traderCandleInk,
  type CandleInk,
} from "./clarityInkOwner";

/** A fake native candle series that records every ink it is handed. */
function fakeSeries() {
  const inks: Partial<CandleInk>[] = [];
  return { inks, applyOptions(o: Record<string, unknown>) { inks.push(o as Partial<CandleInk>); } };
}
const RED_GREEN = { candleUp: "#00ff00", candleDown: "#ff0000" };

describe("Clarity ink owner — gold never reverts to red/green under a live stream", () => {
  it("a stream of live ticks + per-render settings objects + timeframe/symbol changes keeps the series transparent", () => {
    const owner = new ClarityInkOwner();
    // Symbol load: series born under Clarity is born transparent.
    expect(isHiddenInk(owner.inkForNewSeries(RED_GREEN, true, true))).toBe(true);
    let series = fakeSeries();
    for (let tick = 0; tick < 500; tick++) {
      // Each live tick: the paint loop draws Clarity…
      owner.afterFrame(series, RED_GREEN, 120, 120);
      // …and the parent re-renders, handing a NEW but equal settings object.
      owner.applySettings(series, { ...RED_GREEN }, true);
      // Every 100 ticks: a timeframe or symbol change builds a new series,
      // with one frame where the bars ref and the series disagree (0 drawn).
      if (tick % 100 === 99) {
        expect(isHiddenInk(owner.inkForNewSeries(RED_GREEN, true, true))).toBe(true);
        series = fakeSeries();
        owner.afterFrame(series, RED_GREEN, 0, 120);
        owner.afterFrame(series, RED_GREEN, 0, 0);
      }
      for (const ink of series.inks) expect(isHiddenInk(ink)).toBe(true);
    }
    expect(owner.hidden).toBe(true);
  });

  it("before Clarity has painted, settings apply the trader's ink; the first painted frame hides it once", () => {
    const owner = new ClarityInkOwner();
    const s = fakeSeries();
    owner.applySettings(s, RED_GREEN, true);
    expect(s.inks[0]).toMatchObject({ upColor: "#00ff00", downColor: "#ff0000" });
    owner.afterFrame(s, RED_GREEN, 10, 10);
    owner.afterFrame(s, RED_GREEN, 10, 10);
    expect(s.inks).toHaveLength(2);
    expect(isHiddenInk(s.inks[1])).toBe(true);
  });

  it("a sustained run of empty frames (bars on hand) restores the trader's ink — the face is never blank", () => {
    const owner = new ClarityInkOwner();
    owner.inkForNewSeries(RED_GREEN, true, true);
    const s = fakeSeries();
    for (let i = 0; i < CLARITY_EMPTY_FRAMES_BEFORE_RESTORE - 1; i++) owner.afterFrame(s, RED_GREEN, 0, 50);
    expect(s.inks).toHaveLength(0);
    owner.afterFrame(s, RED_GREEN, 0, 50);
    expect(s.inks[0]).toMatchObject({ upColor: "#00ff00" });
    expect(owner.hidden).toBe(false);
  });

  it("clarity off or a layer fault restores at once; a rejecting series keeps the flag so the next frame retries", () => {
    const owner = new ClarityInkOwner();
    owner.inkForNewSeries(RED_GREEN, true, true);
    let calls = 0;
    const flaky = { applyOptions() { calls++; if (calls === 1) throw new Error("rebuilding"); } };
    owner.restore(flaky, RED_GREEN);
    expect(owner.hidden).toBe(true);
    owner.restore(flaky, RED_GREEN);
    expect(owner.hidden).toBe(false);
    owner.restore(flaky, RED_GREEN);
    expect(calls).toBe(2);
  });

  it("with Clarity off a new series wears the trader's ink and nothing is hidden", () => {
    const owner = new ClarityInkOwner();
    expect(owner.inkForNewSeries(RED_GREEN, false, true)).toEqual(traderCandleInk(RED_GREEN));
    expect(owner.hidden).toBe(false);
    // Born EMPTY under Clarity is born hidden too (serving 135eec5: one red/green
    // frame per rebuild when the first live print painted the trader's ink).
    expect(isHiddenInk(owner.inkForNewSeries(RED_GREEN, true, false))).toBe(true);
    expect(owner.hidden).toBe(true);
    expect(CLARITY_HIDDEN_INK.upColor).toBe("rgba(0,0,0,0)");
  });

  it("settings content key: equal values share a key, a changed value does not", () => {
    expect(settingsContentKey({ ...RED_GREEN })).toBe(settingsContentKey({ ...RED_GREEN }));
    expect(settingsContentKey({ ...RED_GREEN, candleUp: "#d4af37" })).not.toBe(settingsContentKey(RED_GREEN));
    expect(settingsContentKey(null)).toBe("");
  });

  it("MainChart routes every native-ink write through the owner and keys settings on content", () => {
    const src = readFileSync("src/components/chart/MainChart.tsx", "utf8");
    expect(src.length).toBeGreaterThan(100000);
    expect(src).not.toContain("clarityHidRef");
    expect(src).toContain("const chartSettingsKey = settingsContentKey(chartSettingsIn);");
    expect(src).toContain("clarityInkRef.current!.applySettings(candleRef.current, chartSettings, clarityOnRef.current);");
    expect(src).toContain("clarityInkRef.current!.inkForNewSeries(chartSettings, clarityOnRef.current, mainPoints.length > 0)");
    expect(src).toContain("clarityInkRef.current!.afterFrame(srs, chartSettingsRef.current, drawnC, bsC.length);");
    const dash = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
    expect(dash.length).toBeGreaterThan(100000);
    expect(dash).toContain("const effChartSettings: ChartSettings = useMemo(() => {");
  });
});
