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
 *   ORDERED cvd path (equal-count       viewModels/selectDeltaDivergence
 *     segments, tape order)              `segment` — a sequence, not a sum;
 *                                        reads selectAggressorFlow's totals
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
 * bar's prints into its own buy/sell sums under different names — and its
 * successor still matched three spellings, so a `reduce`, an `aggressor ===
 * "BUY"`, an `isBuyer` flag or a destructured loop walked past it (and
 * selectDeltaDivergence's own signed-CVD fold was never listed). Round 4
 * (verifier, 2026-09-27) found the round-3 scan still lexical and still
 * blind to keyed accumulators, switch/case folds, SIGN tables and
 * `.toLowerCase()` side tests while claiming "every shape"; those four are now
 * caught, and the claim is cut down to what is proved.
 *
 * WHAT THE SCAN IS: a LEXICAL guard over comment-stripped source. It flags a
 * side test/steer near an accumulation, an accumulator indexed by side, or a
 * side-signed carrier that is later summed — exactly the shapes listed on
 * `foldSites` below, each with a specimen in its NOT VACUOUS test, and each
 * new one with a mutation that turns that specimen RED. It is NOT a data-flow
 * analysis: the renamed-local, far-apart, helper-call and additive-table
 * shapes listed on `foldSites` pass it. Any re-sum of already-folded sides
 * (`ask/bid/buy/sell/askVol/bidVol/buyVol/sellVol +=`) is listed separately.
 * A file that folds (in a caught shape) fails unless it is on the named
 * allow-list below with its owner and the reason it may exist. Stale entries
 * fail too.
 *
 * WHAT BACKS THE ONE-LADDER LAW beyond the scan: the ownership table above,
 * the exact-count pins in "one flow brain" (one ladder ref, one ladder fold,
 * one Tape-CVD call, one session-counter writer, one readings compiler), and
 * review of every new flow selector against the table. A green run is
 * evidence of no fold in a caught shape outside the allow-list — not proof
 * that no second fold exists.
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

/**
 * THE COMPUTATION DETECTOR — a LEXICAL guard, not a data-flow analysis.
 *
 * A side-fold is two things near each other: a SIDE TEST and an ACCUMULATION.
 * It recognises these, and only these, spellings and shapes (each one has a
 * specimen in the NOT VACUOUS test below):
 *
 *   side test   `side` / `aggressor…` compared (either operand order, optional
 *               `.toLowerCase()` / `.toUpperCase()`) to "buy"/"sell" in any of
 *               three casings; `isBuy` / `isSell` / `isBuyer` / `isSeller`;
 *               `case "buy":` / `case "sell":` in a switch
 *   side steer  a side-keyed lookup MULTIPLIED into a value
 *               (`SIGN[t.side] * t.size`)
 *   accumulate  `+=` / `-=` (not `± 1`), `x = x ± …`, a `reduce` accumulator,
 *               `acc ± (side-test …)`
 *   keyed fold  an accumulator INDEXED by side: `totals[t.side] += size`,
 *               `acc[t.side] = (acc[t.side] ?? 0) + size`,
 *               `m.set(t.side, (m.get(t.side) ?? 0) + size)`
 *
 * A file folds when a side test or steer and an accumulation sit within
 * FOLD_WINDOW characters (one statement, an if/else pair, a short switch),
 * when a keyed fold appears anywhere, or when a side-SIGNED value is bound to a
 * name (`signed = side === "buy" ? size : -size`, `signed = SIGN[side] * size`)
 * and that name is accumulated anywhere in the same file.
 *
 * WHAT IT DOES NOT CATCH (known, not smoothed over):
 *   - a side read through a renamed local (`const k = t.side; tot[k] += …`,
 *     `const { side: s } = t; if (s === "buy") …`) or a differently named
 *     field (`t.dir > 0`, `t.b`, a numeric sign already on the print);
 *   - a side test and its accumulation more than FOLD_WINDOW characters apart
 *     with no signed carrier between them (an UNSIGNED carrier such as
 *     `q = isBuy ? size : 0` summed far away), or a carrier summed in another
 *     file;
 *   - a fold behind a helper call (`sumBy(xs, sideSize)`, `Object.groupBy`
 *     then a sum, a filter in one statement and a sum in another);
 *   - a lookup table that is ADDED rather than multiplied, or a long switch
 *     whose `case` label sits more than FOLD_WINDOW characters from its `+=`;
 *   - anything outside src/ .ts/.tsx, and anything its comment stripper
 *     mistakes for a comment.
 *
 * What backs the one-ladder law beyond this scan: the OWNERSHIP TABLE in this
 * file's header and the exact-count pins in "one flow brain" below (one
 * ladder ref, one ladder fold, one selectTapeCvd call, one writer of the
 * session counters, one compiler of the readings), plus human review of any
 * new flow selector against that table. A green scan means "no fold in a
 * shape listed above outside the allow-list" — nothing more.
 */
const SIDE_WORD = String.raw`(?:buy|sell|BUY|SELL|Buy|Sell)`;
const SIDE_REF = String.raw`\b(?:side|aggressor\w*)\b(?:\s*\.\s*to(?:Lower|Upper)Case\s*\(\s*\))?`;
const SIDE_TEST = String.raw`(?:${SIDE_REF}\s*[!=]==?\s*["']${SIDE_WORD}["']` +
  String.raw`|["']${SIDE_WORD}["']\s*[!=]==?\s*[\w.?\][]*${SIDE_REF}` +
  String.raw`|\bis(?:Buy|Sell)(?:er)?\b` +
  String.raw`|\bcase\s*["']${SIDE_WORD}["']\s*:)`;
const SIDE_TEST_RE = new RegExp(SIDE_TEST, "g");
/** A side-keyed index: `[t.side]`, `[p?.aggressorSide]`, `[side.toLowerCase()]`. */
const SIDE_INDEX = String.raw`\[\s*[\w.?]*${SIDE_REF}\s*\]`;
/** A side-keyed LOOKUP multiplied into a value: `SIGN[t.side] * size`, `size * SIGN[side]`. */
const SIDE_STEER = String.raw`(?:\w+${SIDE_INDEX}\s*\*|\*\s*\w+${SIDE_INDEX})`;
const SIDE_STEER_RE = new RegExp(SIDE_STEER, "g");
/** Accumulations. `+= 1` is a counter step, not a size fold. */
const ACCUM_RES: readonly RegExp[] = [
  /(?<![-+])[-+]=(?!=)(?!\s*1\b)/g,
  /\b([\w.]+)\s*=\s*\1\s*[-+](?![-+=])/g,
  /\.reduce\s*\(\s*\(?\s*(\w+)[\s\S]{0,240}?\b\1\s*[-+](?![-+=])/g,
  new RegExp(String.raw`[\w.\]]+\s*[-+]\s*\(\s*[\w.\][]*` + SIDE_TEST, "g"),
];
/** Folds INTO an accumulator keyed by side — a fold on their own, no window needed. */
const KEYED_FOLD_RES: readonly RegExp[] = [
  // totals[t.side] += size   (a keyed `+= 1` is a counter)
  new RegExp(String.raw`\w${SIDE_INDEX}\s*[-+]=(?!=)(?!\s*1\b)`, "g"),
  // acc[t.side] = (acc[t.side] ?? 0) + size
  new RegExp(String.raw`\w${SIDE_INDEX}\s*=(?!=)[^;\n]{0,160}?[\w)\]]\s*[-+]\s*(?!1\b)[\w(]`, "g"),
  // m.set(t.side, (m.get(t.side) ?? 0) + size)
  new RegExp(String.raw`\.set\s*\(\s*[\w.?]*${SIDE_REF}\s*,[^;\n]{0,160}?[\w)\]]\s*[-+]\s*(?!1\b)[\w(]`, "g"),
];
/** A name bound to a side-SIGNED value: `? x : -x`, `? -x : x`, or `SIGN[side] * x`. */
const SIGNED_CARRIER_RES: readonly RegExp[] = [
  new RegExp(
    String.raw`\b(\w+)\s*[:=]\s*\(?\s*[\w.\][]*` + SIDE_TEST +
      String.raw`\s*\)?\s*\?\s*(?:([\w.]+)\s*:\s*-\s*\2\b|-\s*([\w.]+)\s*:\s*\3\b)`,
    "g",
  ),
  new RegExp(String.raw`\b(\w+)\s*[:=]\s*[\w.]*\s*` + SIDE_STEER, "g"),
];
const FOLD_WINDOW = 160;

function spans(src: string, res: readonly RegExp[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const re of res) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of src.matchAll(g)) out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

/** Every place in `src` where a side steers size into an accumulator. */
function foldSites(src: string): string[] {
  const out: string[] = [];
  const accums = spans(src, ACCUM_RES);
  for (const [ss, se] of spans(src, [SIDE_TEST_RE, SIDE_STEER_RE])) {
    const near = accums.find(([as, ae]) => (as >= se ? as - se : ss >= ae ? ss - ae : 0) <= FOLD_WINDOW);
    if (near) out.push(src.slice(Math.min(ss, near[0]), Math.max(se, near[1])));
  }
  for (const [ks, ke] of spans(src, KEYED_FOLD_RES)) out.push(src.slice(ks, ke));
  for (const carrier of SIGNED_CARRIER_RES) {
    for (const m of src.matchAll(carrier)) {
      const name = m[1];
      const acc = new RegExp(
        String.raw`(?:[-+]=\s*[\w.]*\b${name}\b|[\w)\]]\s*[-+]\s*[\w.]*\b${name}\b)(?!\s*[:=(])`,
      ).exec(src);
      if (acc) out.push(`${m[0]} … ${acc[0]}`);
    }
  }
  return out;
}

const isTapeFold = (src: string): boolean => foldSites(src).length > 0;

/** Re-summing sides that were already folded somewhere (rows, bars, counters). */
const SIDE_SUM_RE = /\b(?:ask|bid|buy|sell|askVol|bidVol|buyVol|sellVol)\s*\+=/;

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
    why: "the one window-wide owner; StockInfoPanel, cockpit strip and absorption read it, and divergence reads its totals (not its path)",
  },
  "src/lib/marketData/viewModels/selectDeltaDivergence.ts": {
    owner: "the ORDERED cumulative-delta path over equal-count segments (Delta Divergence, via useOrderFlowReadings)",
    why: "a SEQUENCE, not a sum: cvd at the end of each equal-count slice of the tape in tape order; " +
      "selectAggressorFlow keeps one window total and the ladder is keyed by bar time, so neither holds this path",
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
  "src/lib/broker/webullLedger.ts": {
    owner: "Webull lifetime ledger — the trader's broker position walked fill by fill into episodes",
    why: "ORDER side (the trader's own Webull fills), not tape aggressor side",
  },
  "src/lib/chart/fxRelatedFlow.ts": {
    owner: "spot FX related-market line — a CME future's (6E/6B/6J) signed prints, five-minute words in the footer",
    why: "a DIFFERENT market's tape, never the chart symbol's: it may not enter the spot chart's ladder (Drive §1E: spot and CME are not equivalent)",
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
  "src/lib/chart/fxRelatedFlow.ts": "its own five-minute related-market window (owner, see TAPE_FOLDS)",
};

describe("THE FOLD SCAN — every side-fold in production code is named, or the build is red", () => {
  it("NOT VACUOUS: the detector catches every shape its header lists (and only those are claimed)", () => {
    const FOLDS: Record<string, string> = {
      // The ladder's own fold, and the exact fold the Inspect Ticket used to carry.
      ladder: `bid: existing.bid + (tick.side === "sell" ? tick.size : 0),`,
      ticket: `for (const p of signed) {\n    if (p.side === "buy") buyVol += p.size as number;`,
      returnPlus: `return s + (t.side === "sell" ? t.size : -t.size);`,
      compoundTernary: `net += t.side === "buy" ? t.size : -t.size;`,
      // Rewrites the previous spelling-matcher let through:
      reduce: `const d = prints.reduce((acc, t) => acc + (t.side === "buy" ? t.size : -t.size), 0);`,
      reduceStatement: `const d = xs.reduce((acc, t) => {\n  const q = t.side === "buy" ? t.size : 0;\n  return acc + q;\n}, 0);`,
      reduceUpper: `const d = xs.reduce((m, x) => { return m - (x.aggressor === "SELL" ? x.qty : -x.qty); }, 0);`,
      ternaryAssign: `const isBuy = t.side === "buy";\nnet = net + (isBuy ? t.size : -t.size);`,
      isBuyerFlag: `if (trade.isBuyer) up = up + trade.qty;`,
      ifElse: `if (print.aggressorSide === "BUY") {\n  lifted += print.size;\n} else {\n  hit += print.size;\n}`,
      yodaElse: `if ("sell" === t.side) { down -= -t.size; } else { up += t.size; }`,
      destructured: `for (const { side, size } of prints) {\n  if (side === "buy") b = b + size;\n  else s = s + size;\n}`,
      // The fold split in two: a signed value bound in one function, summed in another.
      signedCarrier:
        `function sided(t) { return { signed: t.side === "buy" ? t.size : -t.size }; }\n` +
        `${"/* far away */\n".repeat(40)}function path(ps) { let cvd = 0; for (const p of ps) cvd += p.signed; return cvd; }`,
      // Round 4 — shapes the round-3 scan let through (verifier, 2026-09-27):
      keyedCompound: `for (const t of prints) totals[t.side] += t.size;`,
      keyedAssign: `acc[p.aggressorSide] = (acc[p.aggressorSide] ?? 0) + p.qty;`,
      mapSet: `byside.set(t.side, (byside.get(t.side) ?? 0) + t.size);`,
      switchCase:
        `switch (t.side) {\n  case "buy":\n    buyVol2 += t.size;\n    break;\n  case "sell":\n    sellVol2 += t.size;\n}`,
      signTable: `const SIGN = { buy: 1, sell: -1 };\nfor (const t of prints) cvd += SIGN[t.side] * t.size;`,
      signTableTrailing: `net = net + t.size * SIGN[t.aggressor];`,
      signTableCarrier:
        `function sided(t) { return { signed: SIGN[t.side] * t.size }; }\n` +
        `${"/* far away */\n".repeat(40)}function path(ps) { let cvd = 0; for (const p of ps) cvd += p.signed; return cvd; }`,
      lowerCase: `if (t.side.toLowerCase() === "buy") up += t.size;`,
      upperCaseYoda: `if ("SELL" === p.aggressor.toUpperCase()) { down += p.size; }`,
    };
    // Every shape is checked before failing, so a regression names ALL it lets through.
    expect(Object.entries(FOLDS).filter(([, src]) => !isTapeFold(src)).map(([shape]) => shape), "missed").toEqual([]);
    expect(SIDE_SUM_RE.test(`buyVol += p.size;`)).toBe(true);
    // …and not a filter, a colour choice, a counter, or a signed value never summed.
    const NOT_FOLDS: Record<string, string> = {
      filter: `const signed = xs.filter(p => p.side === "buy" || p.side === "sell");`,
      colour: `const c = side === "buy" ? green : red;`,
      counter: `if (t.side === "buy") buys += 1;`,
      signedNeverSummed: `const value = side === "buy" ? dominant : -dominant;\nreturn { value };`,
      keyedCounter: `counts[t.side] += 1;`,
      keyedRead: `const c = COLOURS[t.side];\nstyle.color = c;`,
      keyedPlainSet: `lastBySide.set(t.side, t.price);`,
      signTableNeverSummed: `const dir = SIGN[t.side] * 1;\nreturn dir;`,
    };
    expect(Object.entries(NOT_FOLDS).filter(([, src]) => isTapeFold(src)).map(([shape]) => shape), "false alarms").toEqual([]);
  });

  it("KNOWN BLIND SPOTS: the shapes the header says pass the scan do pass it (the header is not a claim beyond this)", () => {
    // If one of these starts being caught, move it into the header's caught
    // list and into the specimens above. Until then the ownership table, the
    // exact-count pins and review are what stand in front of it.
    const PASSES: Record<string, string> = {
      renamedLocal: `const k = t.side;\ntotals[k] += t.size;`,
      renamedDestructure: `const { side: s } = t;\nif (s === "buy") up += t.size;`,
      otherField: `if (t.dir > 0) up += t.size;`,
      unsignedCarrierFar: `const q = t.side === "buy" ? t.size : 0;\n${"/* far */\n".repeat(40)}acc += q;`,
      helperCall: `const up = sumBy(prints, sideSize);`,
      additiveTable: `cvd += OFFSET[t.side] + t.size;`,
    };
    expect(Object.entries(PASSES).filter(([, src]) => isTapeFold(src)).map(([shape]) => shape)).toEqual([]);
  });

  it("NOT VACUOUS: the scan catches the real folds it lists, in their real files", () => {
    // Each allow-listed owner is caught by the COMPUTATION, not by a spelling —
    // including the split signed-CVD fold in selectDeltaDivergence.
    for (const rel of [
      CHART_REL,
      "src/lib/marketData/viewModels/selectDeltaDivergence.ts",
      "src/lib/marketData/viewModels/selectDeltaLevels.ts",
    ]) {
      expect(foldSites(SOURCES.get(rel) ?? "").length, rel).toBeGreaterThan(0);
    }
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

  it("the ladder is published after EVERY fold that changed it — the ticket never rests a batch behind", () => {
    // The fold effect marks a change on the ladder write and on eviction…
    const fold = CHART.slice(CHART.indexOf("let ladderChanged = false;"));
    // (2026-09-28: the write lives in THE one fold, `foldPrint`, shared with the
    // provider backfill; it reports the write, and the live effect marks it.)
    expect(fold.slice(0, 4000)).toMatch(/if \(foldPrint\(tick, true\)\) ladderChanged = true;/);
    const foldFn = CHART.slice(CHART.indexOf("const foldPrint = (tick: Tick, heardLive: boolean): boolean => {"));
    expect(foldFn.slice(0, 4000)).toMatch(/ask:\s*existing\.ask[\s\S]{0,900}return true;/);
    expect(fold.slice(0, 4000)).toMatch(/tickAccRef\.current\.delete\(oldest\);[\s\S]{0,120}ladderChanged = true;/);
    // …and publishes through the throttle-and-trail rule, OUTSIDE the 250 ms
    // chip throttle (inside it, a fold in the window told no one).
    expect(fold.slice(0, 4000)).toMatch(/if \(ladderChanged\) flowLadderPublisherRef\.current\?\.changed\(\);/);
    const throttle = fold.slice(fold.indexOf("sessionTapeFlushRef.current > 250"));
    expect(throttle.slice(0, throttle.indexOf("\n    }\n"))).not.toMatch(/onFlowLadderRef|flowLadderPublisher/);
    expect(CHART).toMatch(/createFlowLadderPublisher\(/);
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
