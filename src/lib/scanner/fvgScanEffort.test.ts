/**
 * Garden 19 §13 slice 2 — FVG + effort→response on the scanner, and the effort split in the FVG
 * study. One owner's cell (the Response Matrix through fvgRelationships), never a second classifier;
 * UNAVAILABLE / EFFORT_SILENT where the market reports no traded volume. Order flow stays
 * UNAVAILABLE from bars — candles are never read as order flow.
 */
import { describe, expect, it } from "vitest";

import { runFvgStudy, FVG_STUDY_EFFORT_SILENT, FVG_STUDY_ORDER_FLOW_SPLIT } from "@/lib/backtest/fvgStudy";
import { journalFixtureBars } from "@/lib/journal/journalProofFixture";
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { fvgBarContext, fvgBarOnlyRelationships } from "@/lib/marketData/fvg/fvgBarContext";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";

import { FVG_CONVERGENCE_LABEL, FVG_EFFORT_CONVERGENCE_CELLS, FVG_SCAN_ORDER_FLOW_UNAVAILABLE, fvgScanConditionsFromBars } from "./fvgScanConditions";

const ALL = journalFixtureBars();
const SYM = ALL[0].symbolId;
const TF = ALL[0].timeframe;
const STEP = ALL[1].asOf - ALL[0].asOf;
const scan = (bars: readonly CanonicalBar[], symbol = SYM) => {
  const r = fvgScanConditionsFromBars({ symbol, timeframe: TF, bars: symbol === SYM ? bars : bars.map(b => ({ ...b, symbolId: symbol, barId: b.barId.replace(SYM, symbol) })), nowMs: bars[bars.length - 1].asOf + STEP });
  if (r.status !== "READ") throw new Error(r.reason);
  return r;
};
/** Every prefix of the sample series that ends on a bar revealing a condition (bounded walk). */
const prefixes = (() => {
  const out: CanonicalBar[][] = [];
  for (let n = 140; n < 900 && out.length < 60; n++) {
    const bars = ALL.slice(0, n);
    if (scan(bars).hits.length) out.push(bars);
  }
  return out;
})();

describe("scanner: FVG + effort→response", () => {
  it("is a named condition with a trader label", () => {
    expect(FVG_CONVERGENCE_LABEL.FVG_PLUS_EFFORT).toBe("FVG + effort→response");
    expect(FVG_EFFORT_CONVERGENCE_CELLS).toEqual(["ABSORBED", "INITIATIVE", "VACUUM"]);
    expect(prefixes.length).toBeGreaterThan(5);
  });

  it("a hit only when the owner read ABSORBED / INITIATIVE / VACUUM on the gap's own bars; ORDINARY and QUIET are not convergence", () => {
    let hits = 0, plain = 0;
    for (const bars of prefixes) {
      const r = scan(bars);
      const ctx = fvgBarContext(bars, SYM, TF);
      const ledger = detectFvgs(bars, { symbolId: SYM, timeframe: TF });
      for (const id of new Set(r.hits.map(h => h.objectId))) {
        const o = ledger.objects.find(x => x.objectId === id)!;
        const cells = fvgBarOnlyRelationships(ctx, o).relationships.filter(x => x.family === "EFFORT_RESPONSE").map(x => x.ownerState!);
        const want = cells.some(c => FVG_EFFORT_CONVERGENCE_CELLS.includes(c));
        const got = r.convergence.filter(c => c.condition === "FVG_PLUS_EFFORT" && c.objectId === id);
        expect(got.length, id).toBe(want ? 1 : 0);
        if (want) {
          hits++;
          expect(got[0].relationships.every(line => /^Effort→response (displacement|touch) bar — at (formation|touch \d+) · owner says (ABSORBED|INITIATIVE|VACUUM) · .* · FULL \(traded volume; each bar ranked over the 100 closed bars ending at that bar\)$/.test(line))).toBe(true);
          // Returns to the same object as the condition that revealed it.
          expect(got[0].href).toBe(r.hits.find(h => h.objectId === id)!.href);
        } else plain++;
      }
      expect(r.unavailable.some(u => u.condition === "FVG_PLUS_EFFORT")).toBe(false);
    }
    expect(hits).toBeGreaterThan(0);
    expect(plain).toBeGreaterThan(0);
  });

  it("no traded volume → UNAVAILABLE with the volume owner's reason, never a hit (spot FX; a placeholder feed)", () => {
    const fx = scan(prefixes[0], "EURUSD");
    expect(fx.convergence.some(c => c.condition === "FVG_PLUS_EFFORT")).toBe(false);
    expect(fx.unavailable.find(u => u.condition === "FVG_PLUS_EFFORT")?.reason).toMatch(/no centralised traded volume/);
    const ph = scan(prefixes[0].map(b => ({ ...b, volume: 1 })));
    expect(ph.convergence.some(c => c.condition === "FVG_PLUS_EFFORT")).toBe(false);
    expect(ph.unavailable.some(u => u.condition === "FVG_PLUS_EFFORT")).toBe(true);
  });

  it("order flow is never a hit from bars — UNAVAILABLE with its sentence, unchanged", () => {
    for (const bars of prefixes.slice(0, 10)) {
      const r = scan(bars);
      expect(r.convergence.some(c => c.condition === "FVG_PLUS_ORDER_FLOW")).toBe(false);
      expect(r.unavailable).toContainEqual({ condition: "FVG_PLUS_ORDER_FLOW", reason: FVG_SCAN_ORDER_FLOW_UNAVAILABLE });
    }
  });
});

describe("FVG study: the effort split (displacement bar)", () => {
  const study = (bars: readonly CanonicalBar[], symbolId = SYM, effort?: string) =>
    runFvgStudy({ series: [{ symbolId, timeframe: TF, bars: bars.map(b => ({ ...b, symbolId })) }], asOfMs: bars[bars.length - 1].asOf + STEP, filters: effort ? { effort } : {} });

  it("groups every gap by its displacement bar's cell; the groups add up", () => {
    const s = study(ALL);
    const groups = s.facets.effort;
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(s.detectedInWindow);
    expect(groups.every(g => ["ABSORBED", "INITIATIVE", "VACUUM", "QUIET", "ORDINARY", FVG_STUDY_EFFORT_SILENT].includes(g.value))).toBe(true);
    expect(groups.filter(g => g.value !== FVG_STUDY_EFFORT_SILENT).length).toBeGreaterThan(1);
    // The not-read group is listed last, after the owner's cells in alphabetical order.
    const named = groups.map(g => g.value).filter(v => v !== FVG_STUDY_EFFORT_SILENT);
    expect(named).toEqual([...named].sort());
    if (groups.some(g => g.value === FVG_STUDY_EFFORT_SILENT)) expect(groups[groups.length - 1].value).toBe(FVG_STUDY_EFFORT_SILENT);
    const mixed = study(ALL.map((b, i) => (i % 97 === 5 ? { ...b, volume: 0 } : b)));
    expect(mixed.facets.effort[mixed.facets.effort.length - 1].value).toBe(FVG_STUDY_EFFORT_SILENT);
    const pick = groups.find(g => g.value !== FVG_STUDY_EFFORT_SILENT)!;
    expect(study(ALL, SYM, pick.value).objects.length).toBe(pick.count);
    expect(Object.keys(s.by.effort).sort()).toEqual(groups.map(g => g.value).sort());
  });

  it("a gap's group is fixed once its displacement bar closed — later bars never move it", () => {
    const early = study(ALL.slice(0, 600));
    const late = study(ALL);
    const lateCtx = fvgBarContext(ALL, SYM, TF);
    for (const o of early.objects.slice(0, 40)) {
      const a = fvgBarOnlyRelationships(fvgBarContext(ALL.slice(0, 600), SYM, TF), o).relationships.find(r => r.kind === "DISPLACEMENT_EFFORT")?.ownerState;
      const twin = late.objects.find(x => x.objectId === o.objectId)!;
      const b = fvgBarOnlyRelationships(lateCtx, twin).relationships.find(r => r.kind === "DISPLACEMENT_EFFORT")?.ownerState;
      expect(b, o.objectId).toBe(a);
    }
  });

  it("no traded volume → every gap is EFFORT_SILENT; the order-flow split stays UNAVAILABLE", () => {
    const s = study(ALL.slice(0, 600), "EURUSD");
    expect(s.facets.effort).toEqual([{ value: FVG_STUDY_EFFORT_SILENT, count: s.detectedInWindow }]);
    expect(s.evidenceSplits).toContainEqual(FVG_STUDY_ORDER_FLOW_SPLIT);
    expect(FVG_STUDY_ORDER_FLOW_SPLIT.status).toBe("UNAVAILABLE");
  });
});
