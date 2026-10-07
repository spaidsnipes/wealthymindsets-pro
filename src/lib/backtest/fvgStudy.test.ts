/**
 * Backtest Lab — FVG study mode (Garden 19 §20–§21). The study READS the one
 * engine through the one as-of accessor and tallies with the one descriptive
 * tally; it never detects, ages or counts a gap of its own.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { describeFvgOutcomes } from "@/lib/marketData/fvg/fvgStats";
import {
  FVG_STUDY_LABEL,
  FVG_STUDY_REGIME_NOTE,
  fvgDisplacementBand,
  fvgMedianText,
  fvgShareText,
  fvgStudyClockAt,
  runFvgStudy,
  type FvgStudySeries,
} from "./fvgStudy";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);

function series(sym: string, rows: readonly Row[], t0 = T0): CanonicalBar[] {
  return rows.map(([o, h, l, c], i) => {
    const asOf = t0 + i * MIN;
    return {
      barId: `${sym}|1m|${asOf}|e0`, symbolId: sym, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
      open: o, high: h, low: l, close: c, volume: 1, asOf, receivedAt: asOf + MIN,
      fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
    };
  });
}

const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const BEAR: Row[] = [[100, 101, 99, 99.5], [99.5, 99.7, 96, 96.2], [96.2, 98, 95, 95.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const BELOW: Row = [95.5, 96.5, 95, 95.5];
const TOUCH_PARTIAL: Row = [104, 104.2, 101.6, 102.6];

const S_BULL: FvgStudySeries = { symbolId: "BTC-USD", timeframe: "1m", bars: series("BTC-USD", [...FLAT, ...BULL, AWAY, TOUCH_PARTIAL, AWAY, AWAY, AWAY, AWAY, AWAY]) };
const S_BEAR: FvgStudySeries = { symbolId: "ETH-USD", timeframe: "1m", bars: series("ETH-USD", [...FLAT, ...BEAR, BELOW]) };
const END = (s: FvgStudySeries) => s.bars[s.bars.length - 1].asOf + MIN;

describe("FVG study — reads the one engine, labelled descriptive", () => {
  it("names the definition id/version and the DESCRIPTIVE label; never a prediction", () => {
    const st = runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL) });
    expect(st.label).toBe(FVG_STUDY_LABEL);
    expect(st.label).toMatch(/DESCRIPTIVE EVIDENCE/);
    expect(st.label).toMatch(/Not a prediction/);
    expect(st.definition).toEqual({ id: "FVG_3C", version: 1 });
    expect(st.stats.definitionId).toBe("FVG_3C");
  });

  it("its tally IS describeFvgOutcomes over the engine's objects (no second counter)", () => {
    const st = runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: Math.max(END(S_BULL), END(S_BEAR)) });
    const objs = [
      ...detectFvgs(S_BULL.bars, { symbolId: "BTC-USD", timeframe: "1m" }).objects,
      ...detectFvgs(S_BEAR.bars, { symbolId: "ETH-USD", timeframe: "1m" }).objects,
    ];
    expect(st.stats).toEqual(describeFvgOutcomes(objs));
    expect(st.detectedInWindow).toBe(objs.length);
    expect(st.series.map(s => s.symbolId)).toEqual(["BTC-USD", "ETH-USD"]);
  });

  it("FUTURE-LEAK: frozen right after formation, the study reveals nothing later", () => {
    const full = runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL) });
    const o = full.objects.find(x => x.direction === "BULLISH")!;
    expect(o.firstTouch).not.toBeNull(); // the full history did touch it…
    const frozen = runFvgStudy({ series: [S_BULL], asOfMs: o.createdAt });
    const f = frozen.objects.find(x => x.objectId === o.objectId)!;
    expect(f.state).toBe("BORN");
    expect(f.firstTouch).toBeNull();
    expect(f.mitigation).toBe("NONE");
    expect(frozen.stats.touched.count).toBe(0);
    expect(frozen.series[0].barsRead).toBeLessThan(full.series[0].barsRead);
    // …and one millisecond earlier it does not exist.
    expect(runFvgStudy({ series: [S_BULL], asOfMs: o.createdAt - 1 }).objects.find(x => x.objectId === o.objectId)).toBeUndefined();
  });

  it("stepping the clock bar by bar never shows a fact before its bar closed", () => {
    const n = S_BULL.bars.length;
    let touchedSeen = false;
    for (let i = 0; i < n; i++) {
      const t = fvgStudyClockAt(S_BULL, i)!;
      expect(t).toBe(S_BULL.bars[i].asOf + MIN);
      const st = runFvgStudy({ series: [S_BULL], asOfMs: t });
      const truncated = detectFvgs(S_BULL.bars.slice(0, i + 1), { symbolId: "BTC-USD", timeframe: "1m" });
      expect(st.objects).toEqual(truncated.objects);
      if (st.stats.touched.count > 0) touchedSeen = true;
    }
    expect(touchedSeen).toBe(true);
  });

  it("the Date Range only counts objects created inside it; earlier bars still warm ATR", () => {
    const all = runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL) });
    const o = all.objects[0];
    expect(runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL), fromMs: o.createdAt + 1 }).detectedInWindow).toBe(all.detectedInWindow - all.objects.filter(x => x.createdAt <= o.createdAt).length);
    expect(runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL), fromMs: o.createdAt }).detectedInWindow).toBe(all.detectedInWindow);
  });

  it("filters: instrument / timeframe / direction / session / regime / displacement / crossesSession", () => {
    const asOf = Math.max(END(S_BULL), END(S_BEAR));
    const both = runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf });
    const bear = runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf, filters: { direction: "BEARISH" } });
    expect(bear.objects.every(o => o.direction === "BEARISH")).toBe(true);
    expect(bear.filtered).toBe(both.objects.filter(o => o.direction === "BEARISH").length);
    expect(bear.detectedInWindow).toBe(both.detectedInWindow);
    const eth = runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf, filters: { instrument: "ETH-USD" } });
    expect(eth.objects.every(o => o.symbolId === "ETH-USD")).toBe(true);
    expect(runFvgStudy({ series: [S_BULL], asOfMs: asOf, filters: { timeframe: "5m" } }).filtered).toBe(0);
    const band = fvgDisplacementBand(both.objects[0]);
    expect(runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf, filters: { displacement: band } }).objects.every(o => fvgDisplacementBand(o) === band)).toBe(true);
    expect(runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf, filters: { crossesSession: "CROSSES_SESSION" } }).objects.every(o => o.session.crossesSession)).toBe(true);
    const seg = both.objects[0].session.segment;
    expect(runFvgStudy({ series: [S_BULL, S_BEAR], asOfMs: asOf, filters: { session: seg } }).objects.every(o => o.session.segment === seg)).toBe(true);
    // Facets list every value with its count, before filters.
    expect(both.facets.direction.reduce((a, f) => a + f.count, 0)).toBe(both.detectedInWindow);
    expect(both.by.direction.BULLISH.detected + (both.by.direction.BEARISH?.detected ?? 0)).toBe(both.filtered);
  });

  it("regime is UNTAGGED on bar-only history and the study SAYS so", () => {
    const st = runFvgStudy({ series: [S_BULL], asOfMs: END(S_BULL) });
    expect(st.facets.regime.map(f => f.value)).toEqual(["UNTAGGED"]);
    expect(st.regimeNote).toBe(FVG_STUDY_REGIME_NOTE);
  });

  it("every printed rate carries count/of; medians carry their sample", () => {
    expect(fvgShareText({ count: 7, of: 9, share: 7 / 9 })).toBe("7 of 9 (78%)");
    expect(fvgShareText({ count: 0, of: 0, share: null })).toBe("0 of 0 — nothing to count");
    expect(fvgMedianText(2, 3, "bars")).toBe("2 bars (median of 3)");
    expect(fvgMedianText(null, 0, "bars")).toMatch(/no median/);
  });

  it("source: no second engine, no fill expectation, no score", () => {
    const src = readFileSync(path.resolve(__dirname, "fvgStudy.ts"), "utf8");
    expect(src).toContain("fvgStateAsOf(");
    expect(src).toContain("describeFvgOutcomes(");
    expect(src).not.toMatch(/b3\.low\s*>\s*b1\.high|fairValueGaps/);
    expect(src).not.toMatch(/must fill|will fill|probabilit(y|ies) of|score\s*[:=]/i);
  });
});
