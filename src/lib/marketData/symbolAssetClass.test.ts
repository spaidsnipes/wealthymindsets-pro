/**
 * Two halves, because the defect had two halves.
 *
 * BEHAVIOUR — the classifier agrees with itself across notations. The single
 * assertion that matters most is that "NQ1!" and "NQ=F" land in the same class,
 * because they are the same contract and disagreeing about that is what shipped
 * the live defect.
 *
 * ADOPTION — the four route files that used to hand-type this predicate now
 * import it. This is the guard that fails when the next engineer, needing a
 * futures test in a fifth route, types `sym.includes("1!")` again. Nothing
 * throws when they do that and `tsc --noEmit` exits 0 when they do that; only a
 * guard that reads the SOURCE can see it.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "@/lib/sourceScan";
import { YF_MAP, YF_CRYPTO_PINS } from "@/lib/yahooSymbol";
import {
  classifySymbol,
  toYahooSymbol,
  isUnsupportedByEquityVendors,
  unsupportedAssetClassReason,
  observesUsEquitySession,
} from "./symbolAssetClass";

/**
 * Driven off `YF_MAP`, the OWNER's table — not a list retyped here.
 *
 * The first version of these tests iterated a `FUTURES_CONTRACTS` array that
 * this module exported itself. That array was the duplicate; deleting it is
 * what broke these tests, which is the correct and useful thing for a
 * duplicate's removal to do. Iterating the owner means a contract added there
 * is covered here on the day it is added, including the six micros (MNQ, MES,
 * MYM, M2K, MGC, MCL) the duplicate never knew about.
 */
const CONTRACT_PAIRS = Object.entries(YF_MAP);

describe("classifySymbol — one answer per instrument, in every notation", () => {
  it("puts both notations of the same contract in the same class", () => {
    // The live defect in one line. Driven off the owner's own table rather
    // than a retyped pair list, so a contract added later is covered on the
    // day it is added.
    for (const [tv, yahoo] of CONTRACT_PAIRS) {
      expect(
        classifySymbol(tv),
        `${tv} and ${yahoo} are the same contract and must classify alike`,
      ).toBe(classifySymbol(yahoo));
    }
  });

  it("classifies futures from either notation, including unnamed contracts", () => {
    expect(classifySymbol("NQ1!")).toBe("FUTURES");
    expect(classifySymbol("NQ=F")).toBe("FUTURES");
    // Not in the table — an unnamed contract is still a futures contract.
    expect(classifySymbol("ZC=F")).toBe("FUTURES");
    expect(classifySymbol("MNQ1!")).toBe("FUTURES");
  });

  it("reads a LEADING slash as futures, not forex", () => {
    // The read routes called this forex and the order route called it futures.
    // They cannot both be right. Rejecting a futures order is the safe
    // reading, so the futures reading wins.
    expect(classifySymbol("/ES")).toBe("FUTURES");
  });

  it("classifies forex from the pair notations", () => {
    expect(classifySymbol("EURUSD=X")).toBe("FOREX");
    expect(classifySymbol("EUR/USD")).toBe("FOREX");
  });

  it("classifies indices, including the VIX that VX1! actually points at", () => {
    expect(classifySymbol("^VIX")).toBe("INDEX");
    expect(classifySymbol("^GSPC")).toBe("INDEX");
    // VX1! resolves to ^VIX, an index — NOT a tradable futures contract. The
    // old private map knew the mapping but nothing read the consequence.
    expect(classifySymbol("VX1!")).toBe("INDEX");
  });

  it("classifies crypto in every notation the pickers actually offer", () => {
    // `canonicalIdentity` keeps its ticker set private, so this cannot iterate
    // it and does not pretend to be exhaustive. What it proves is the thing
    // that changed: the NOTATIONS now work, because the question is asked of
    // the module that knows them. The hand-typed set this replaced held
    // fourteen bare bases and would have answered UNKNOWN to all four of the
    // non-bare forms below — forms the product's own pickers emit.
    for (const bare of ["BTC", "ETH", "SOL", "DOGE", "ATOM"]) {
      expect(classifySymbol(bare), `${bare} bare`).toBe("CRYPTO");
      expect(classifySymbol(`${bare}-USD`), `${bare}-USD paired`).toBe("CRYPTO");
    }
    expect(classifySymbol("BTC.COINBASE"), "venue-pinned").toBe("CRYPTO");
    expect(classifySymbol("DOGEUSD"), "quote-suffixed, no separator").toBe("CRYPTO");
    expect(classifySymbol("BTC/USD"), "slashed pair is a coin, not forex").toBe("CRYPTO");
    expect(classifySymbol("ETHUSDT"), "unlisted quote currency is still crypto").toBe("CRYPTO");
  });

  it("classifies plain US tickers as equities", () => {
    for (const s of ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "F"]) {
      expect(classifySymbol(s)).toBe("EQUITY");
    }
  });

  it("says UNKNOWN rather than guessing", () => {
    // "Unrecognised" and "a stock" are different facts, and sweeping the first
    // into the second is how a bad symbol becomes a confident quote request.
    expect(classifySymbol("")).toBe("UNKNOWN");
    expect(classifySymbol("TOOLONGTICKER")).toBe("UNKNOWN");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(classifySymbol("  nq=f ")).toBe("FUTURES");
    expect(classifySymbol("btc")).toBe("CRYPTO");
  });
});

describe("toYahooSymbol", () => {
  it("translates every contract the owner names", () => {
    for (const [tv, yahoo] of CONTRACT_PAIRS) {
      expect(toYahooSymbol(tv)).toBe(yahoo);
    }
  });

  it("keeps the owner's crypto pins, which a naive base-USD rule would destroy", () => {
    // The concrete cost of the duplicate this atom removed. `symbolAssetClass`
    // had shipped `${base}-USD`, which resolves SUI to Salmonation and PEPE to
    // PEPEGOLD — a different asset's price printed under the right asset's
    // name. Worse than the empty response it replaced: an absent price is
    // honestly absent, a wrong one looks right.
    for (const [base, pin] of Object.entries(YF_CRYPTO_PINS)) {
      expect(toYahooSymbol(base), `${base} must resolve to ${pin.yahooName}, not ${pin.displacedName}`)
        .toBe(pin.ticker);
      expect(toYahooSymbol(base)).not.toBe(`${base}-USD`);
    }
  });

  it("passes an unknown symbol through untouched rather than inventing one", () => {
    expect(toYahooSymbol("AAPL")).toBe("AAPL");
  });
});

describe("the decline message distinguishes 'not now' from 'not ever'", () => {
  it("declines futures and forex, and only those", () => {
    expect(isUnsupportedByEquityVendors("NQ=F")).toBe(true);
    expect(isUnsupportedByEquityVendors("EURUSD=X")).toBe(true);
    expect(isUnsupportedByEquityVendors("AAPL")).toBe(false);
    expect(isUnsupportedByEquityVendors("BTC")).toBe(false);
    // An index is not refused BY CLASS: Yahoo-backed lanes carry index levels,
    // so a class-level predicate that refused ^VIX would delete a working
    // instrument from the routes that do serve it.
    //
    // That is narrower than this line used to assert. The comment here read
    // "An index IS carried", full stop — an assumption, MEASURED FALSE on
    // 2026-09-12: Finnhub's free tier returned an empty quote for ^GSPC, ^DJI,
    // ^IXIC and ^VIX in the same window it priced AAPL, SPY, IWM, GLD and NVDA.
    // Coverage is per-lane, so it is the LANE's fact to state (/api/market now
    // states it) and this module keeps stating only the class fact. Both
    // answers living here is how one question came to have five.
    expect(isUnsupportedByEquityVendors("^VIX")).toBe(false);
  });

  it("says NOT CARRIED rather than NO DATA", () => {
    // This is the whole user-facing point. "No data" means "try later".
    const reason = unsupportedAssetClassReason("NQ=F");
    expect(reason).not.toBeNull();
    // Anchored on the DISTINCTION, not on one phrasing of it. The sentence
    // used to end "not carried HERE" while also naming what "here" carries —
    // a coverage claim about a caller this module is never told the identity
    // of. Dropping that clause is what widened the wording.
    expect(reason!.toLowerCase()).toContain("not carried");
    expect(reason!.toLowerCase()).not.toContain("no data");
    // And it names the symbol, so the message is about THIS request.
    expect(reason).toContain("NQ=F");
  });

  it("stays silent for a symbol the vendor genuinely carries", () => {
    expect(unsupportedAssetClassReason("AAPL")).toBeNull();
    expect(unsupportedAssetClassReason("^VIX")).toBeNull();
  });
});

/**
 * The import, not the module path. A source scan that matches a bare path stays
 * green when a mere CODE COMMENT names the module — that exact miss was caught
 * earlier this shift on a different guard, and two of this shift's stale
 * restatements had survived inside their own test files by the same mechanism.
 */
const OWNER_IMPORT = 'from "@/lib/marketData/symbolAssetClass"';

/** Routes that must ask the owner what kind of instrument a symbol is. */
const ADOPTING_ROUTES = [
  "src/app/api/market/route.ts",
  "src/app/api/alpaca/route.ts",
  "src/app/api/heatmap/route.ts",
  "src/app/api/alpaca-trading/route.ts",
] as const;

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

/**
 * Judge what a route RUNS, not what it says about itself.
 *
 * This guard caught its own author twice, in two different ways.
 *
 * FIRST: it scanned raw file text, and the comment I wrote above the repaired
 * predicate in `/api/market` QUOTES the old one verbatim — that is the whole
 * point of the comment, so the next reader knows which defect was removed. The
 * guard read the epitaph as the corpse. Same defect class as
 * `sentinelsHaveAMachine.test.ts`, where a workflow's own header comment kept a
 * deleted `vitest` step looking wired, and as `repoFrontDoorAuthority.test.ts`.
 * A document that DESCRIBES a thing is not a document that DOES it — and the
 * mistake runs in both directions.
 *
 * SECOND: the fix for that was a four-line comment stripper typed right here —
 * in an atom whose entire subject is that a fact typed in four places is four
 * opinions. `src/lib/sourceScan.mjs` already owns the stripper and its own
 * header records that a private copy is exactly how the prose-vs-code blind
 * spot survived its first repair. So this delegates. The shortest possible
 * demonstration that knowing the principle does not make you immune to it.
 */
function readCode(rel: string): string {
  return stripComments(read(rel));
}

describe("symbolAssetClass — adoption guard", () => {
  it.each(ADOPTING_ROUTES)("%s imports the owner", (rel) => {
    expect(read(rel)).toContain(OWNER_IMPORT);
  });

  it.each(["src/app/api/market/route.ts", "src/app/api/alpaca/route.ts"])(
    "%s no longer hand-types a futures test",
    (rel) => {
      const src = readCode(rel);
      // Each of these is a real predicate that used to live in one of these
      // files. In code they are the defect; the comments above them are prose
      // and are allowed to quote history, so match the executable forms only.
      expect(src).not.toContain('symbol.includes("1!")');
      expect(src).not.toContain('sym.endsWith("1!")');
      expect(src).not.toContain('sym.includes("=F")');
    },
  );

  it("keeps the trading route's own regex as well as the shared classifier", () => {
    // NOT a tidiness exemption. On an order path a union can only refuse more,
    // and replacing the local regex with the classifier would have narrowed
    // the refusal set — the regex rejects bare roots like CL and SI that the
    // classifier reads as equities. A test that demanded the "clean" single
    // predicate would be a test arguing for a riskier order path.
    const src = read("src/app/api/alpaca-trading/route.ts");
    expect(src).toContain("classifySymbol(sym)");
    expect(src).toContain("(ES|NQ|RTY|YM|GC|CL|SI|ZB|ZN|6[A-Z])");
  });

  it("keeps the Yahoo notation table in exactly one place", () => {
    // The table encodes a FACT (these two strings are one contract), not a
    // formatting preference. A second copy is a second opinion.
    const heatmap = readCode("src/app/api/heatmap/route.ts");
    expect(heatmap).not.toContain('"NQ1!":"NQ=F"');
    expect(heatmap).toContain("toYahooSymbol(");
  });
});

/**
 * `observesUsEquitySession` decides whether a surface may DELETE bars. It is
 * the one predicate here whose wrong answer removes observed prints from the
 * screen, so it is the one whose default has to lean toward showing them.
 */
describe("US equity session membership", () => {
  it("THE MEASURED FAILURE: a futures contract was being RTH-filtered", () => {
    // MainChart's old rule ended in "default: treat as a US equity / ETF", and
    // "/ES" matched none of the escapes above it.
    expect(observesUsEquitySession("/ES")).toBe(false);
    expect(observesUsEquitySession("NQ1!")).toBe(false);
    expect(observesUsEquitySession("NQ=F")).toBe(false);
  });

  it("does not strip bars from instruments that trade around the clock", () => {
    for (const symbol of ["BTC-USD", "ETH-USD", "BTC.COINBASE", "EURUSD=X", "EUR/USD"]) {
      expect(observesUsEquitySession(symbol), `${symbol} trades outside the bell`).toBe(false);
    }
  });

  it("holds equities and cash indices to the bell", () => {
    for (const symbol of ["AAPL", "SPY", "QQQ", "^VIX", "^GSPC"]) {
      expect(observesUsEquitySession(symbol), `${symbol} trades the equity session`).toBe(true);
    }
  });

  it("refuses to hide prints from a symbol it cannot name a session for", () => {
    // The honest direction for a default that DELETES data.
    expect(observesUsEquitySession("NOTATICKERATALL")).toBe(false);
    expect(observesUsEquitySession("")).toBe(false);
  });
});

describe("MainChart asks the owner instead of retyping the predicate", () => {
  it("no longer carries its own futures, forex or crypto tests", () => {
    const src = readCode("src/components/chart/MainChart.tsx");
    expect(src).toContain("observesUsEquitySession(");
    expect(src).toContain("isUnsupportedByEquityVendors(");
    expect(src).not.toMatch(/endsWith\("1!"\)/);
    expect(src).not.toMatch(/includes\("1!"\)/);
    expect(src).not.toMatch(/includes\("=F"\)/);
    // The coin list that had to be edited every time a coin was added, and
    // which never knew the `-USD` form the app's own pickers emit.
    expect(src).not.toMatch(/\["BTC","ETH"/);
  });
});
