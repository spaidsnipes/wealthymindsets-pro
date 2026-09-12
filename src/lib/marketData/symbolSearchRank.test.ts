import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MATCH_RANK,
  normalizeSymbolToken,
  rankSymbolHits,
  symbolMatchRank,
} from "./symbolSearchRank";
import { matchCuratedSymbols } from "./curatedSymbolCatalog";
import { polygonCategory, reconcileSearchCategory } from "./searchResultCategory";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * The exact twenty rows `/api/symbol-search?q=spy` returned on 2026-09-11 with
 * POLYGON_KEY set, market open, in the order the vendor sent them. Frozen as
 * data so the regression is reproducible without a network call or a key.
 */
const MEASURED_SPY_ROWS = [
  "APYI", "DNUT", "DSPY", "DVSP", "GSPY", "HRSPY", "I:ISPYIV", "ISPY",
  "JDSPY", "KGSPY", "KSPY", "LXSPY", "SGLRF", "SGP", "SPY", "SPYA",
  "SPYC", "SPYD", "SPYG", "SPYH",
].map((sym) => ({ sym, label: `${sym} listing` }));

describe("the symbol the trader typed is the first row", () => {
  it("THE DEFECT: SPY came back FIFTEENTH out of twenty", () => {
    // Reproduce the shipped ordering before asserting the fix, so this test
    // fails loudly if the measurement itself was wrong.
    expect(MEASURED_SPY_ROWS.findIndex((r) => r.sym === "SPY")).toBe(14);

    const ranked = rankSymbolHits("spy", MEASURED_SPY_ROWS, 20, { dropUnmatched: false });
    expect(ranked[0].sym, "the exact ticker must lead").toBe("SPY");
  });

  it("ranks SPY above SPYG — the plain ticker wins the tie", () => {
    const ranked = rankSymbolHits("spy", [{ sym: "SPYG" }, { sym: "SPY" }], 10);
    expect(ranked.map((r) => r.sym)).toEqual(["SPY", "SPYG"]);
  });

  it("THE DEFECT: AAPL came back behind three leveraged single-stock ETFs", () => {
    const rows = ["AAPB", "AAPD", "AAPE", "AAPL", "AAPU"].map((sym) => ({ sym }));
    expect(rankSymbolHits("aapl", rows, 5)[0].sym).toBe("AAPL");
  });

  it("matches across NOTATIONS, so punctuation does not hide the exact match", () => {
    // A trader types `vix`, not `^VIX`. If the exact tier is punctuation
    // sensitive then in practice it almost never fires.
    expect(symbolMatchRank("vix", { sym: "^VIX" })).toBe(MATCH_RANK.EXACT);
    expect(symbolMatchRank("btcusd", { sym: "BTC-USD" })).toBe(MATCH_RANK.EXACT);
    expect(symbolMatchRank("esf", { sym: "ES=F" })).toBe(MATCH_RANK.EXACT);
    expect(symbolMatchRank("vx1", { sym: "VX1!" })).toBe(MATCH_RANK.EXACT);
  });

  it("strips the vendor's private namespace but not the ticker under it", () => {
    // Polygon's `I:`/`C:`/`X:` prefixes are dialect, not identity.
    expect(normalizeSymbolToken("I:DLVIX")).toBe("dlvix");
    expect(normalizeSymbolToken("C:EURUSD")).toBe("eurusd");
    expect(normalizeSymbolToken("X:BTCUSD")).toBe("btcusd");
    expect(symbolMatchRank("eurusd", { sym: "C:EURUSD" })).toBe(MATCH_RANK.EXACT);
  });

  it("orders the tiers: exact, prefix, contains, label, none", () => {
    const rows = [
      { sym: "ZZZZ", label: "a spy fund" },  // label only
      { sym: "DSPY" },                        // contains
      { sym: "SPY" },                         // exact
      { sym: "SPYG" },                        // prefix
      { sym: "QQQ", label: "Nasdaq 100" },    // nothing
    ];
    expect(
      rankSymbolHits("spy", rows, 10, { dropUnmatched: false }).map((r) => r.sym),
    ).toEqual(["SPY", "SPYG", "DSPY", "ZZZZ", "QQQ"]);
  });

  it("an alias is a promise of identity, so it ranks with the exact match", () => {
    expect(symbolMatchRank("bitcoin", { sym: "BTCUSD", aliases: ["btc", "bitcoin"] }))
      .toBe(MATCH_RANK.EXACT);
  });

  it("is a total order — the same query always renders the same list", () => {
    const rows = ["SPYD", "SPYC", "SPYA", "SPY", "SPYG"].map((sym) => ({ sym }));
    const a = rankSymbolHits("spy", rows, 10).map((r) => r.sym);
    const b = rankSymbolHits("spy", [...rows].reverse(), 10).map((r) => r.sym);
    expect(a).toEqual(b);
    expect(a[0]).toBe("SPY");
  });

  it("an empty query matches nothing rather than everything", () => {
    expect(symbolMatchRank("", { sym: "SPY" })).toBe(MATCH_RANK.NONE);
    expect(rankSymbolHits("  ", MEASURED_SPY_ROWS, 20)).toEqual([]);
  });

  it("respects the limit and never returns a negative slice", () => {
    expect(rankSymbolHits("spy", MEASURED_SPY_ROWS, 3, { dropUnmatched: false })).toHaveLength(3);
    expect(rankSymbolHits("spy", MEASURED_SPY_ROWS, -1, { dropUnmatched: false })).toEqual([]);
  });
});

describe("dropUnmatched separates a local catalogue from a vendor's answer", () => {
  const rows = [{ sym: "SPY" }, { sym: "QQQ", label: "Nasdaq 100" }];

  it("a LOCAL row this owner cannot match is not a result", () => {
    expect(rankSymbolHits("spy", rows, 10).map((r) => r.sym)).toEqual(["SPY"]);
  });

  it("a VENDOR row it cannot match is ranked last, never deleted", () => {
    // The vendor searched fields we do not model. Dropping its answer would be
    // this process claiming to know better than the source it asked.
    expect(rankSymbolHits("spy", rows, 10, { dropUnmatched: false }).map((r) => r.sym))
      .toEqual(["SPY", "QQQ"]);
  });
});

describe("Polygon's `indices` market is an Index, not a Stock", () => {
  it("THE DEFECT: market was read for crypto and fx but not for indices", () => {
    // MEASURED: every `I:` row came back `market:"indices"` with an empty
    // `type`, so the function answered null and reconcile defaulted to Stock.
    expect(polygonCategory("indices", "")).toBe("Index");
    expect(reconcileSearchCategory("I:DLVIX", polygonCategory("indices", ""))).toBe("Index");
    expect(reconcileSearchCategory("I:SVIXIV", polygonCategory("indices", ""))).toBe("Index");
  });

  it("every branch reads BOTH market and type — the symmetry is the fix", () => {
    expect(polygonCategory("crypto", "")).toBe("Crypto");
    expect(polygonCategory("fx", "")).toBe("Forex");
    expect(polygonCategory("indices", "")).toBe("Index");
    expect(polygonCategory("stocks", "cs")).toBe("Stock");
    expect(polygonCategory("", "unheard_of")).toBeNull();
  });

  it("does NOT teach the vendor's `I:` dialect to the market-notation owner", () => {
    // `classifySymbol` reads `^VIX` / `ES=F` / `BTC-USD`. Pushing one vendor's
    // namespace into it would make a vendor-neutral owner vendor-specific.
    const owner = stripComments(read("src/lib/marketData/symbolAssetClass.ts"));
    expect(owner).not.toMatch(/["'`]I:/);
  });
});

describe("one ranking owner, not two careful copies", () => {
  it("the curated catalogue delegates instead of re-typing the sort", () => {
    const code = stripComments(read("src/lib/marketData/curatedSymbolCatalog.ts"));
    expect(code).toMatch(/rankSymbolHits\(/);
    expect(
      code,
      "the private prefix-only sort must stay retired — it had no exact tier",
    ).not.toMatch(/\.startsWith\(q\)/);
  });

  it("the route delegates too, for BOTH vendors", () => {
    const code = stripComments(read("src/app/api/symbol-search/route.ts"));
    expect(code.match(/rankSymbolHits\(/g) ?? []).toHaveLength(2);
  });

  it("the route asks the vendor for MORE than it returns", () => {
    // Ranking cannot recover a row alphabetical truncation never sent, so the
    // ask must be wider than the answer. This is the actual root cause.
    const code = stripComments(read("src/app/api/symbol-search/route.ts"));
    expect(code, "a hardcoded limit=20 is the bug returning").not.toMatch(/&limit=20&/);
    expect(code).toMatch(/POLYGON_FETCH_LIMIT/);
    const fetchLimit = Number(/POLYGON_FETCH_LIMIT = (\d+)/.exec(code)?.[1]);
    const resultLimit = Number(/RESULT_LIMIT = (\d+)/.exec(code)?.[1]);
    expect(fetchLimit).toBeGreaterThan(resultLimit);
  });

  it("the real catalogue ranks its exact matches first", () => {
    // Against the shipping catalogue, not a fixture.
    expect(matchCuratedSymbols("spy", 5)[0]?.sym).toBe("SPY");
    expect(matchCuratedSymbols("btcusd", 5)[0]?.sym).toBe("BTCUSD");
    expect(matchCuratedSymbols("", 5)).toEqual([]);
  });
});
