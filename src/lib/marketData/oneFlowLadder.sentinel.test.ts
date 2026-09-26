/**
 * SENTINEL — ONE FLOW BRAIN (Garden 16 §15: "one owner per truth").
 *
 * ── THE DUPLICATE THIS WAS BORN FROM (audited 2026-09-26) ──────────────────
 *
 * MainChart held TWO accumulators of the same flow fact — every real executed
 * trade folded into bar → price level → {bid, ask}:
 *
 *   tickAccRef        → footprint cells, Tape CVD, the rail footprint
 *   deltaTickAccRef   → Delta Bubbles
 *
 * Same filters (`tick.trade`, finite positive price/size, verified aggressor
 * tape), same bar bucketing, same `minTick`/`dp` rounding — but two dedupe sets
 * (8000→4000 vs 12000→6000) and two eviction passes. Its only justification,
 * "tickAccRef stays lot-filtered", had stopped being true: there is no lot
 * floor on that fold. Two copies of one ladder agree exactly until one of them
 * is edited, and then a delta bubble and the footprint cell under it read two
 * different deltas for the same bar. The second was deleted; bubbles read the
 * one ladder.
 *
 * ── THE OWNERSHIP TABLE THIS PINS ──────────────────────────────────────────
 *
 *   per-bar/per-level aggressor ladder  MainChart `tickAccRef` (one fold)
 *   per-bar Tape CVD                    lib/marketData/tapeCvd `selectTapeCvd`
 *   rail footprint (F06A)               viewModels/selectTapeFootprint
 *   session delta / buy / sell counters lib/marketData/sessionSymbolStore
 *                                        `recordSessionTrade` (only writer)
 *   window aggressor sum (ask/bid/cvd)  lib/marketData/selectAggressorFlow
 *   absorption / delta divergence /
 *   stacked imbalance / delta levels    lib/marketData/useOrderFlowReadings
 *                                        (only caller of each selector)
 *
 * Source scans, comment-stripped: prose names the things it forbids.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";

const ROOT = process.cwd();
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");
const code = (rel: string): string => stripComments(read(rel));

/** Every non-test .ts/.tsx under src/, comment-stripped, keyed by path. */
function productionSources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(ROOT, rel)).isDirectory()) {
        walk(rel);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
        out.set(rel, stripComments(read(rel)));
      }
    }
  };
  walk("src");
  return out;
}

const SOURCES = productionSources();
const CHART_REL = "src/components/chart/MainChart.tsx";
const CHART = code(CHART_REL);

/** The files whose code matches `re`, sorted. */
function filesMatching(re: RegExp): string[] {
  return [...SOURCES].filter(([, src]) => re.test(src)).map(([rel]) => rel).sort();
}

/** How many times `re` (global) matches across all production code. */
function countAcross(re: RegExp): number {
  let n = 0;
  for (const src of SOURCES.values()) n += (src.match(re) ?? []).length;
  return n;
}

describe("one flow brain — each flow fact has one computing owner", () => {
  it("NOT VACUOUS: the scan sees the product and the chart", () => {
    expect(SOURCES.size).toBeGreaterThan(500);
    expect(CHART.length).toBeGreaterThan(50_000);
  });

  it("MainChart holds exactly ONE bar → level → {bid, ask} ladder", () => {
    const ladders =
      CHART.match(/useRef<Map<number,\s*Map<number,\s*\{\s*bid:\s*number;\s*ask:\s*number\s*\}>>>/g) ?? [];
    expect(
      ladders.length,
      "a second per-bar/per-level aggressor accumulator is back in MainChart — " +
        "two ladders of one tape will disagree the moment either fold is edited",
    ).toBe(1);
    expect(CHART).toMatch(/const tickAccRef = useRef<Map<number,/);
    expect(CHART).not.toMatch(/deltaTickAccRef/);
  });

  it("the fold that fills the ladder is written ONCE in the whole product", () => {
    // `ask: existing.ask + (tick.side === "buy" …)` — the ladder's fold step.
    const folds = /ask:\s*existing\.ask\s*\+\s*\(\s*tick\.side\s*===\s*"buy"/g;
    expect(countAcross(folds), "the ask-side fold is written more than once").toBe(1);
    expect(filesMatching(/ask:\s*existing\.ask\s*\+\s*\(\s*tick\.side\s*===\s*"buy"/)).toEqual([CHART_REL]);
  });

  it("Delta Bubbles, footprint, Tape CVD and the rail footprint all read THE ladder", () => {
    const bubbles = CHART.slice(CHART.indexOf("const getDeltaBubbleLevels"));
    expect(bubbles.slice(0, 400)).toMatch(/tickAccRef\.current\.get\(bar\.time/);
    expect(CHART).toMatch(/accumulator:\s*tickAccRef\.current/);
    expect(CHART).toMatch(/selectTapeFootprint\(tickAccRef\.current/);
  });

  it("per-bar Tape CVD is computed by selectTapeCvd, called once", () => {
    // Call sites only — the owner's own `function selectTapeCvd(` is not one.
    const call = /(?<!function\s)\bselectTapeCvd\s*\(/g;
    expect(countAcross(call)).toBe(1);
    expect(filesMatching(/(?<!function\s)\bselectTapeCvd\s*\(/)).toEqual([CHART_REL]);
  });

  it("session delta / buy / sell counters have one writer: sessionSymbolStore", () => {
    expect(filesMatching(/stats\.(delta|buyVol|sellVol)\s*[-+]=/)).toEqual([
      "src/lib/marketData/sessionSymbolStore.ts",
    ]);
    expect(filesMatching(/\brecordSessionTrade\s*\(/).filter((f) => !f.endsWith("sessionSymbolStore.ts"))).toEqual([
      CHART_REL,
    ]);
  });

  it("the window aggressor sum (ask/bid → cvd) is summed only in selectAggressorFlow", () => {
    expect(filesMatching(/\b(askVol|bidVol)\s*\+=/)).toEqual([
      "src/lib/marketData/selectAggressorFlow.ts",
    ]);
  });

  it("the microstructure readings are compiled only inside useOrderFlowReadings", () => {
    for (const selector of ["selectAbsorption", "selectDeltaDivergence", "selectStackedImbalance", "selectDeltaLevels"]) {
      const callers = filesMatching(new RegExp(`\\b${selector}\\s*\\(`)).filter(
        (f) => !f.endsWith(`/${selector}.ts`),
      );
      expect(callers, `${selector} is called outside its one compiler`).toEqual([
        "src/lib/marketData/useOrderFlowReadings.ts",
      ]);
    }
  });

  it("RATCHET — the rooms that compile the readings are named; a fourth cannot appear", () => {
    // SmartMoneyPanel is KNOWN DEBT, recorded rather than smoothed over: on
    // /charts it opens its own `useWebSocket({ timeframe: "1m" })` and calls
    // this hook a second time, beside ChartsDashboard's call on the chart's
    // own tape. Same engine, two compilations on one screen. Retiring it means
    // handing the panel the room's readings as props; when that lands, delete
    // its row here and this ratchet tightens.
    const callers = filesMatching(/\buseOrderFlowReadings\s*\(/).filter(
      (f) => !f.endsWith("useOrderFlowReadings.ts"),
    );
    expect(callers).toEqual([
      "src/app/command-deck/page.tsx",
      "src/components/chart/ChartsDashboard.tsx",
      "src/components/smart-money/SmartMoneyPanel.tsx",
    ]);
  });

  it("CanonicalBar is declared once", () => {
    expect(filesMatching(/\b(interface\s+CanonicalBar\b|type\s+CanonicalBar\s*=)/)).toEqual([
      "src/lib/marketData/canonicalBar.ts",
    ]);
  });
});
