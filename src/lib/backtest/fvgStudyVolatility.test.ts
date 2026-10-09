/**
 * FVG study — the "volatility at formation" facet (Garden 19 §5, ruling
 * 2026-10-09). BARS scope: read by the one helper (fvgFormationContext) from
 * closed bars up to the gap's middle bar. It is NOT the regime — the regime
 * split stays UNTAGGED with its note.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { FVG_VOLATILITY_FACET_VALUES, FVG_VOLATILITY_SCOPE_NOTE, fvgVolatilityAtFormationByTime, fvgVolatilityFacet } from "@/lib/marketData/fvg/fvgFormationContext";
import { journalFixtureBars, JOURNAL_FIXTURE_SYMBOL, JOURNAL_FIXTURE_TF } from "@/lib/journal/journalProofFixture";
import { FVG_STUDY_REGIME_NOTE, fvgStudyStatRows, fvgStudyVolatility, runFvgStudy, type FvgStudySeries } from "./fvgStudy";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");
const BARS = journalFixtureBars();
const S: FvgStudySeries = { symbolId: JOURNAL_FIXTURE_SYMBOL, timeframe: JOURNAL_FIXTURE_TF, bars: BARS };
const STEP = BARS[1]!.asOf - BARS[0]!.asOf;
const END = BARS[BARS.length - 1]!.asOf + STEP;
const study = runFvgStudy({ series: [S], asOfMs: END });

describe("the volatility facet — one helper, bars scope", () => {
  it("the sample has gaps to group, and every group is one of the helper's four values, in the helper's order", () => {
    expect(study.detectedInWindow).toBeGreaterThan(20);
    const values = study.facets.volatility.map(f => f.value);
    expect(values.length).toBeGreaterThan(1);
    for (const v of values) expect(FVG_VOLATILITY_FACET_VALUES as readonly string[]).toContain(v);
    expect(values).toEqual((FVG_VOLATILITY_FACET_VALUES as readonly string[]).filter(v => values.includes(v)));
    // n of m: the groups account for every gap, exactly once.
    expect(study.facets.volatility.reduce((n, f) => n + f.count, 0)).toBe(study.detectedInWindow);
    expect(Object.values(study.by.volatility).reduce((n, s) => n + s.detected, 0)).toBe(study.filtered);
  });

  it("each gap's group IS the helper's reading at its middle bar — the study decides nothing itself", () => {
    for (const o of study.objects) {
      const direct = fvgVolatilityFacet(fvgVolatilityAtFormationByTime({ bars: BARS, b2OpenMs: o.bars.b2.asOf, timeOf: b => b.asOf }));
      expect(fvgStudyVolatility(S, o), o.objectId).toBe(direct);
    }
    const src = read("lib/backtest/fvgStudy.ts");
    expect(src).toContain("fvgVolatilityFacet(fvgVolatilityAtFormationByTime({ bars: s.bars, b2OpenMs: o.bars.b2.asOf, timeOf: b => b.asOf }))");
    expect(src).not.toMatch(/readMarketBreathing|atrRatio|atrPercentile/);       // no second volatility reading here
  });

  it("every group prints the same n-of-m rows as the whole study", () => {
    for (const [group, stats] of Object.entries(study.by.volatility)) {
      const rows = fvgStudyStatRows(stats, {});
      const touched = rows.find(r => r.testId === "fvg-study-touched")!;
      expect(touched.value, group).toMatch(new RegExp(`^\\d+ of ${stats.detected}\\b`));
      expect(rows.find(r => r.testId === "fvg-study-still-open")!.value, group).toMatch(new RegExp(`^\\d+ of ${stats.detected}\\b`));
    }
  });

  it("the filter narrows to exactly that group's gaps", () => {
    for (const f of study.facets.volatility) {
      const only = runFvgStudy({ series: [S], asOfMs: END, filters: { volatility: f.value as never } });
      expect(only.filtered, f.value).toBe(f.count);
      expect(only.detectedInWindow).toBe(study.detectedInWindow);
    }
  });

  it("FUTURE-LEAK: bars after a gap's middle bar — even tripled — never move the gap to another group", () => {
    const checked = study.objects.filter((_, i) => i % 5 === 0);
    expect(checked.length).toBeGreaterThan(3);
    for (const o of checked) {
      const cut = BARS.findIndex(b => b.asOf === o.bars.b3.asOf);
      const warped: CanonicalBar[] = BARS.map((b, i) => (i <= cut ? b : { ...b, open: b.open * 3, high: b.high * 3, low: b.low * 3, close: b.close * 3 }));
      const asThen: FvgStudySeries = { ...S, bars: BARS.slice(0, cut + 1) };
      const warpedS: FvgStudySeries = { ...S, bars: warped };
      expect(fvgStudyVolatility(asThen, o), o.objectId).toBe(fvgStudyVolatility(S, o));
      expect(fvgStudyVolatility(warpedS, o), o.objectId).toBe(fvgStudyVolatility(S, o));
    }
  });

  it("a gap with too few bars before it is NOT READ — counted, never guessed into a group", () => {
    const early = study.objects.filter(o => BARS.findIndex(b => b.asOf === o.bars.b2.asOf) < 39);
    for (const o of early) expect(fvgStudyVolatility(S, o)).toBe("NOT_READ");
    const short: FvgStudySeries = { ...S, bars: BARS.slice(0, 39) };
    const st = runFvgStudy({ series: [short], asOfMs: BARS[38]!.asOf + STEP });
    expect(st.facets.volatility.every(f => f.value === "NOT_READ")).toBe(true);
    expect(runFvgStudy({ series: [], asOfMs: 0 }).facets.volatility).toEqual([]);
  });
});

describe("volatility is not the regime", () => {
  it("the regime split stays UNTAGGED with its note; the volatility note is the helper's own line and says so", () => {
    expect(study.facets.regime.map(f => f.value)).toEqual(["UNTAGGED"]);
    expect(study.regimeNote).toBe(FVG_STUDY_REGIME_NOTE);
    expect(study.volatilityNote).toBe(FVG_VOLATILITY_SCOPE_NOTE);
    expect(study.volatilityNote).toMatch(/not the regime/);
    expect(study.objects.every(o => o.regime === "UNTAGGED")).toBe(true);
  });

  it("the panel offers it as a filter and a split, words its values, and prints the scope note beside the regime note", () => {
    const panel = read("components/backtest/FvgStudyPanel.tsx");
    expect(panel).toContain('volatility: "Volatility at formation (from bars)",');
    expect(panel).toMatch(/const FILTER_FACETS[^\n]*"volatility"\];/);
    expect(panel).toContain('if (facet === "volatility") return VOLATILITY_VALUE_LABEL[v] ?? v;');
    for (const v of FVG_VOLATILITY_FACET_VALUES) expect(panel, v).toContain(`${v}: "`);
    expect(panel).toContain('data-testid="fvg-study-volatility-note">{study.volatilityNote}</p>');
    expect(panel).toContain("{study.regimeNote && <p");
    // The four value labels describe the range against its normal — nothing about what price will do.
    const labels = panel.slice(panel.indexOf("const VOLATILITY_VALUE_LABEL"), panel.indexOf("export function facetValueLabel"));
    expect(labels.length).toBeGreaterThan(100);
    expect(labels).not.toMatch(/probab|forecast|predict|likely|will |should|must/i);
  });

  it("the helper is now on a screen: its AWAITING_SURFACE ledger entry is gone", () => {
    const ledger = read("lib/screenReach.enforcement.test.ts");
    expect(ledger.length).toBeGreaterThan(2000);
    expect(ledger).not.toContain('"src/lib/marketData/fvg/fvgFormationContext.ts": {');
  });
});
