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
 *   Inspect Ticket per-bar delta        READ off the ladder row (flowLadder
 *                                        `readLadderBar`, fed by MainChart's
 *                                        `onFlowLadder`); never re-folded
 *
 * ── THE FOLD SCAN (Garden 16 §15 verifier, 2026-09-27) ─────────────────────
 *
 * Spellings are not computations: a sentinel that only pinned
 * `ask: existing.ask + (tick.side …)` let the Inspect Ticket fold the same
 * bar's prints into its own buy/sell sums under different names. The scan
 * below looks for the COMPUTATION — a trade's side steering size into an
 * accumulator (`side === "buy" … +=`, `+ (x.side === "buy" ? …`,
 * `+= x.side === …`), and any re-sum of already-folded sides
 * (`ask/bid/buy/sell/askVol/bidVol/buyVol/sellVol +=`) — across every
 * non-test file, and fails unless the file is on the named allow-list below
 * with its owner and the reason it may exist. Stale entries fail too.
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

/** A trade's side steering size into an accumulator. */
const TAPE_FOLD_RES: readonly RegExp[] = [
  /\bside\s*===?\s*["'](?:buy|sell)["'][^;\n]{0,120}?[-+]=/,
  /[-+]\s*\(\s*[\w.\][]*\bside\s*===?\s*["'](?:buy|sell)["']\s*\?/,
  /[-+]=\s*\(?\s*[\w.\][]*\bside\s*===?\s*["'](?:buy|sell)["']\s*\?/,
];
/** Re-summing sides that were already folded somewhere (rows, bars, counters). */
const SIDE_SUM_RE = /\b(?:ask|bid|buy|sell|askVol|bidVol|buyVol|sellVol)\s*\+=/;

const isTapeFold = (src: string): boolean => TAPE_FOLD_RES.some((re) => re.test(src));

/**
 * EVERY file that folds a trade's side into an accumulator, with the fact it
 * owns and why that fold is not a second copy of another owner's. Adding a
 * file here is a §15 decision; write the reason or route through the owner.
 */
const TAPE_FOLDS: Readonly<Record<string, { owner: string; why: string }>> = {
  "src/components/chart/MainChart.tsx": {
    owner: "THE per-bar/per-level aggressor ladder (`tickAccRef`) + its big-trade print rows",
    why: "the one fold; footprint, Delta Bubbles, Tape CVD, rail footprint and the Inspect Ticket read it",
  },
  "src/lib/marketData/selectAggressorFlow.ts": {
    owner: "window aggressor sum (askVol/bidVol/cvd) over the held tape",
    why: "the one window-wide owner; StockInfoPanel, cockpit strip, absorption, divergence read it",
  },
  "src/lib/marketData/sessionSymbolStore.ts": {
    owner: "session buy/sell/delta counters (`recordSessionTrade`)",
    why: "survives symbol switches and tape eviction — a different horizon than any held window",
  },
  "src/lib/marketData/viewModels/selectBigTradeIntelligence.ts": {
    owner: "large-print side volume (prints ≥ the size threshold only)",
    why: "a filtered subset the ladder does not keep apart; not a delta of the whole tape",
  },
  "src/lib/marketData/viewModels/selectDeltaLevels.ts": {
    owner: "window delta by price level (compiled in useOrderFlowReadings)",
    why: "window-wide across bars on its own level step, and compiled on /command-deck where no MainChart ladder exists",
  },
  "src/lib/marketData/viewModels/selectStackedImbalance.ts": {
    owner: "stacked-imbalance rows over the held window (useOrderFlowReadings)",
    why: "same reason as delta levels: window grain, own step, and rooms with no chart ladder",
  },
  "src/lib/marketData/viewModels/selectFootprintWorksheet.ts": {
    owner: "the footprint WORKSHEET — the whole held window divided into six levels",
    why: "window grain (not per bar) gated on a PRINT COUNT (MIN_PRINTS_FOR_LADDER) the ladder does not carry",
  },
  "src/lib/sessionVP.ts": {
    owner: "WMSessionVP — the tape folded onto the session's candle-built price grid (`foldTape`)",
    why: "session grid and horizon; bid/ask are added onto session levels, not bar rows",
  },
  "src/lib/vpEngine.ts": {
    owner: "trade-based volume profile (`computeProfileFromTrades`, Living Profile)",
    why: "volume-at-price across the profile window; side is carried as up/down colouring, not a delta reading",
  },
  "src/app/paper/page.tsx": {
    owner: "paper cash ledger",
    why: "ORDER side (the trader's own buy/sell), not tape aggressor side",
  },
  "src/lib/paperTrade.ts": {
    owner: "paper pending net position",
    why: "ORDER side (the trader's own buy/sell), not tape aggressor side",
  },
};

/** Files that re-sum sides someone else already folded. Reading, not folding. */
const SIDE_SUMS: Readonly<Record<string, string>> = {
  "src/components/chart/MainChart.tsx": "footprint cell bins re-grid THE ladder's row (`realData`)",
  "src/lib/marketData/flowLadder.ts": "`readLadderBar` — a ladder row's totals for the Inspect Ticket",
  "src/lib/marketData/viewModels/selectTapeFootprint.ts": "rail footprint re-bins THE ladder",
  "src/lib/deltaVP.ts": "Delta VP re-bins ladder levels into profile bins",
  "src/lib/chart/footprintCanon.ts": "`barTapeDelta` / clusters sum captured ladder rows",
  "src/lib/marketData/viewModels/selectAbsorptionAnatomyView.ts": "sums bars' own askVol/bidVol fields",
  "src/app/journal/page.tsx": "merges sessionSymbolStore counters across source slots",
  "src/lib/marketData/selectAggressorFlow.ts": "its own window sum (owner)",
  "src/lib/marketData/sessionSymbolStore.ts": "its own counters (owner)",
  "src/lib/marketData/viewModels/selectDeltaLevels.ts": "its own level rows (owner, see TAPE_FOLDS)",
  "src/lib/marketData/viewModels/selectStackedImbalance.ts": "its own rows (owner, see TAPE_FOLDS)",
  "src/lib/marketData/viewModels/selectFootprintWorksheet.ts": "its own six levels (owner, see TAPE_FOLDS)",
  "src/lib/sessionVP.ts": "its own session levels (owner, see TAPE_FOLDS)",
};

describe("THE FOLD SCAN — every side-fold in production code is named, or the build is red", () => {
  it("NOT VACUOUS: the detectors catch the folds they exist for", () => {
    // The ladder's own fold, and the exact fold the Inspect Ticket used to carry.
    expect(isTapeFold(`bid: existing.bid + (tick.side === "sell" ? tick.size : 0),`)).toBe(true);
    expect(isTapeFold(`for (const p of signed) {\n    if (p.side === "buy") buyVol += p.size as number;`)).toBe(true);
    expect(isTapeFold(`return s + (t.side === "sell" ? t.size : -t.size);`)).toBe(true);
    expect(isTapeFold(`net += t.side === "buy" ? t.size : -t.size;`)).toBe(true);
    expect(SIDE_SUM_RE.test(`buyVol += p.size;`)).toBe(true);
    // …and not a filter or a colour choice.
    expect(isTapeFold(`const signed = xs.filter(p => p.side === "buy" || p.side === "sell");`)).toBe(false);
    expect(isTapeFold(`const c = side === "buy" ? green : red;`)).toBe(false);
  });

  it("every file that folds a trade's side into an accumulator is on the allow-list, with its owner", () => {
    const found = [...SOURCES].filter(([, src]) => isTapeFold(src)).map(([rel]) => rel).sort();
    expect(
      found,
      "a new side-fold appeared (or a listed one left). Route it through the owner of " +
        "that fact — the ladder, selectAggressorFlow, sessionSymbolStore — or add it to " +
        "TAPE_FOLDS with the reason it is not a second copy (§15).",
    ).toEqual(Object.keys(TAPE_FOLDS).sort());
    for (const [rel, row] of Object.entries(TAPE_FOLDS)) {
      expect(row.owner.length, rel).toBeGreaterThan(10);
      expect(row.why.length, rel).toBeGreaterThan(20);
    }
  });

  it("every file that re-sums folded sides is on the allow-list, with what it reads", () => {
    const found = filesMatching(SIDE_SUM_RE);
    expect(found, "a new re-sum of ask/bid/buy/sell volume appeared — name what it reads").toEqual(
      Object.keys(SIDE_SUMS).sort(),
    );
  });

  it("the Inspect Ticket reads the ladder row and folds nothing of its own", () => {
    const ticket = "src/lib/marketData/viewModels/selectInspectTicket.ts";
    expect(isTapeFold(SOURCES.get(ticket) ?? "")).toBe(false);
    expect(SIDE_SUM_RE.test(SOURCES.get(ticket) ?? "")).toBe(false);
    expect(SOURCES.get(ticket)).toMatch(/readLadderBar\(input\.ladderBar\)/);
    expect(CHART).toMatch(/onFlowLadderRef\.current\?\.\(\(barTimeSec: number\) => tickAccRef\.current\.get\(barTimeSec\)/);
    expect(code("src/components/chart/ChartsDashboard.tsx")).toMatch(/ladderBar:\s*inspectBar && flowLadderReader \? flowLadderReader\(inspectBar\.time\)/);
  });
});

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
