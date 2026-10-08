/**
 * n ≥ 20 SWEEP — every rate or ratio a trader reads about their own trading on
 * the journal / broker / profile surfaces goes through the one guard
 * (statGuard, STAT_SAMPLE_MIN = 20) or a selector that already refuses below
 * it. Source scan, comment-stripped, with a vacuity guard and positive controls.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { guardCell, guardStat, insufficientLine, STAT_SAMPLE_MIN } from "./statGuard";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";

const SRC = path.resolve(__dirname, "../..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const read = (f: string) => strip(readFileSync(path.join(SRC, f), "utf8"));

const UI = [
  "components/journal/WebullLifetimeLedger.tsx", "components/journal/LedgerPersonalEdge.tsx", "app/journal/page.tsx",
  "components/profile/PersonalEdgePanel.tsx", "components/profile/PlaybookDNAPanel.tsx", "components/profile/SessionEdgePanel.tsx",
];
const SELECTORS = [
  "lib/journal/selectSetupPerformance.ts", "lib/profile/traderPerformanceStats.ts",
  "lib/traderMemory/viewModels/selectPersonalEdge.ts", "lib/traderMemory/viewModels/selectPlaybookDNA.ts", "lib/traderMemory/viewModels/selectSessionEdge.ts",
];

/** A line that FORMATS a rate/ratio for display. */
const RATE_RENDER = /\b(winRate|expectancy|profitFactor|overallExpectancy|avgWin|avgLoss|pastSecondShare|bracketShare)\b[^;]*?(toFixed|pct\(|usd\(|money\(|Math\.round|\* 100)|(toFixed|pct\(|usd\(|money\(|Math\.round)[^;]*?\b(winRate|expectancy|profitFactor|overallExpectancy|avgWin|avgLoss|pastSecondShare|bracketShare)\b/;
/** What makes such a line guarded. */
const GUARDED = /guardStat|guardCell|isMeasured|INSUFFICIENT|typeof [\w.]+ === "number"|=== "UNKNOWN"|\.enough|evidence === "SUPPORTED"/;

export function unguardedRateLines(src: string): string[] {
  return src.split("\n").filter(l => RATE_RENDER.test(l) && !GUARDED.test(l)).map(l => l.trim().slice(0, 140));
}

describe("n ≥ 20 guard sweep (journal / broker / profile)", () => {
  it("vacuity guard: the scan reads every surface and finds rate renders to police", () => {
    const all = [...UI, ...SELECTORS].map(read);
    expect(all.every(s => s.length > 1_000)).toBe(true);
    const rateLines = UI.flatMap(f => read(f).split("\n").filter(l => RATE_RENDER.test(l)));
    expect(rateLines.length).toBeGreaterThan(15);
  });

  it("positive control: the detector catches an unguarded rate and passes a guarded one", () => {
    expect(unguardedRateLines(`<td>{pct(m.winRate)}</td>`)).toHaveLength(1);
    expect(unguardedRateLines(`<Tile value={usd(s.expectancy)} />`)).toHaveLength(1);
    expect(unguardedRateLines(`<td>{guardCell(m.trades, pct(m.winRate))}</td>`)).toHaveLength(0);
  });

  it("no UI surface formats a win rate / expectancy / profit factor / avg win-loss / share outside the guard", () => {
    const offenders = UI.flatMap(f => unguardedRateLines(read(f)).map(l => `${f}: ${l}`));
    expect(offenders).toEqual([]);
  });

  it("every selector's default threshold is the one rule (STAT_SAMPLE_MIN), never a smaller literal", () => {
    for (const f of SELECTORS) {
      const src = read(f);
      expect(src, f).toMatch(/statGuard/);
      expect(src, f).not.toMatch(/(?:Threshold|threshold)\s*\?\?\s*(?:[1-9]|1\d)\b/);
    }
    expect(STAT_SAMPLE_MIN).toBe(20);
    expect(selectPersonalEdge({ ownerId: "o", decisions: [], nowMs: 0 }).sampleThreshold).toBe(20);
  });

  it("the words are Personal Edge's: INSUFFICIENT EVIDENCE with the count", () => {
    expect(insufficientLine(7)).toBe("INSUFFICIENT EVIDENCE — 7 of 20 closed trades so far");
    expect(guardStat(19, "55%")).toEqual({ text: "INSUFFICIENT EVIDENCE", state: "INSUFFICIENT EVIDENCE", note: "INSUFFICIENT EVIDENCE — 19 of 20 closed trades so far" });
    expect(guardStat(20, "55%")).toEqual({ text: "55%", state: "MEASURED", note: null });
    expect(guardCell(3, "40%")).toBe("—");
  });
});
