/**
 * Garden 19 §21 — every historical statistic on the list is worded, for the
 * whole study AND for each split group (instrument / timeframe / session /
 * regime / displacement context …), n of m, INSUFFICIENT below 20 withholding
 * every share, median and mean. No forecast or score words.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { FVG_HORIZONS } from "@/lib/marketData/fvg/fvgDefinition";
import { describeFvgOutcomes, type FvgOutcomeStats } from "@/lib/marketData/fvg/fvgStats";
import { FVG_STUDY_MIN_SAMPLE, fvgStudyStatRows, fvgWithheldText, runFvgStudy } from "./fvgStudy";

const H = Object.fromEntries(FVG_HORIZONS.map(h => [h, h.toLowerCase()]));
const sh = (count: number, of: number) => ({ count, of, share: of ? count / of : null });

function stats(detected: number): FvgOutcomeStats {
  const t = Math.floor(detected * 0.6);
  const base = describeFvgOutcomes([]);
  return {
    ...base,
    detected, bullish: detected - 3, bearish: 3,
    touched: sh(t, detected),
    revisitByHorizon: Object.fromEntries(FVG_HORIZONS.map(h => [h, sh(1, detected)])) as FvgOutcomeStats["revisitByHorizon"],
    revisitSameSession: sh(2, detected), revisitLaterSession: sh(t - 2, detected),
    medianBarsToFirstTouch: 4, medianMsToFirstTouch: 20 * 60_000,
    partialMitigation: sh(1, t), deepMitigation: sh(1, t), fullMitigation: sh(1, t),
    rejectionAfterTouch: sh(2, t), acceptance: sh(1, t), tradeThrough: sh(1, detected),
    stillOpen: sh(detected - t, detected), stillOpenYoungerThan: { bars: 20, count: 1 },
    avgMaxPenetration: 0.42, avgPostTouchDisplacementAtr: 1.25, postTouchDisplacementSample: t - 1,
  };
}

const SECTION_21 = [
  "Gaps counted", "Revisited (touched)", "Revisited in the same session", "Revisited in a later session", "Time to first touch",
  "Deepest reach · partial (<50%)", "Deepest reach · deep (50–99%)", "Deepest reach · full (100%)", "Rejected after a touch",
  "Accepted inside", "Closed through the far edge", "Still open", "Average deepest penetration", "Post-touch move away (ATR)",
];

describe("§21 coverage — every statistic on the list has a row", () => {
  it("the rows name every §21 outcome, plus each first-touch horizon", () => {
    const labels = fvgStudyStatRows(stats(40), H).map(r => r.label);
    for (const l of SECTION_21) expect(labels).toContain(l);
    for (const h of FVG_HORIZONS) expect(labels).toContain(`· ${H[h]}`);
  });

  it("at 20+ gaps: every share is n of m (%), medians and means name their sample", () => {
    const rows = Object.fromEntries(fvgStudyStatRows(stats(40), H).map(r => [r.label, r.value]));
    expect(rows["Revisited in the same session"]).toBe("2 of 40 (5%)");
    expect(rows["Revisited in a later session"]).toBe("22 of 40 (55%)");
    expect(rows["Time to first touch"]).toBe("4 bars (median of 24)");
    expect(rows["Time to first touch (clock)"]).toBe("20 min (median of 24)");
    expect(rows["Average deepest penetration"]).toBe("42% of size (mean of 24)");
    expect(rows["Post-touch move away (ATR)"]).toBe("1.25× ATR (mean of 23 of 24)");
  });

  it("below 20 gaps: INSUFFICIENT — counts stand, every share, median and mean is withheld", () => {
    const rows = fvgStudyStatRows(stats(10), H);
    const v = Object.fromEntries(rows.map(r => [r.label, r.value]));
    expect(v["Gaps counted"]).toMatch(/INSUFFICIENT/);
    expect(v["Revisited in the same session"]).toBe(`2 of 10 — no share below ${FVG_STUDY_MIN_SAMPLE} gaps`);
    expect(v["Time to first touch"]).toBe(`6 of 10 — no median below ${FVG_STUDY_MIN_SAMPLE} gaps`);
    expect(v["Time to first touch (clock)"]).toBe(`6 of 10 — no median below ${FVG_STUDY_MIN_SAMPLE} gaps`);
    expect(v["Average deepest penetration"]).toBe(`6 of 10 — no mean below ${FVG_STUDY_MIN_SAMPLE} gaps`);
    expect(v["Post-touch move away (ATR)"]).toBe(`5 of 10 — no mean below ${FVG_STUDY_MIN_SAMPLE} gaps`);
    expect(rows.some(r => /\(\d+%\)/.test(r.value))).toBe(false);
    expect(fvgWithheldText(3, 25, "mean")).toBeNull();
  });

  it("no forecast or score words in any row or the panel", () => {
    const words = /\b(will|probabilit\w*|likely|expected to|must fill|score|win rate|predict\w*)\b/i;
    for (const r of fvgStudyStatRows(stats(40), H)) expect(`${r.label} ${r.value}`).not.toMatch(words);
    const panel = readFileSync(path.join(process.cwd(), "src/components/backtest/FvgStudyPanel.tsx"), "utf8");
    expect(panel.length).toBeGreaterThan(1000);
    expect(panel).not.toMatch(/win rate|probability of|must fill|will fill/i);
  });
});

describe("§21 outcomes by instrument / timeframe / session / regime / displacement — the same rows per group", () => {
  it("the study splits on every §21 dimension", () => {
    const keys = Object.keys(runFvgStudy({ series: [], asOfMs: 0 }).by);
    for (const k of ["instrument", "timeframe", "session", "regime", "displacement"]) expect(keys).toContain(k);
  });

  it("each split row opens every outcome for that group alone, through the same StatsBlock", () => {
    const panel = readFileSync(path.join(process.cwd(), "src/components/backtest/FvgStudyPanel.tsx"), "utf8");
    expect(panel).toContain("const rows = fvgStudyStatRows(s, HORIZON_LABEL);");
    expect(panel).toContain('data-testid="fvg-study-split-expand"');
    expect(panel).toMatch(/data-testid="fvg-study-split-outcomes"><td colSpan=\{8\} className="px-2 py-2"><StatsBlock s=\{s\} \/>/);
  });
});
