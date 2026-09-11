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
import {
  classifySymbol,
  toYahooSymbol,
  isUnsupportedByEquityVendors,
  unsupportedAssetClassReason,
  FUTURES_CONTRACTS,
  CRYPTO_BASES,
} from "./symbolAssetClass";

describe("classifySymbol — one answer per instrument, in every notation", () => {
  it("puts both notations of the same contract in the same class", () => {
    // The live defect in one line. Driven off the owner's own table rather
    // than a retyped pair list, so a contract added later is covered on the
    // day it is added.
    for (const [tv, yahoo] of FUTURES_CONTRACTS) {
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

  it("classifies crypto in bare and paired notation, from the owner's own set", () => {
    for (const base of CRYPTO_BASES) {
      expect(classifySymbol(base)).toBe("CRYPTO");
      expect(classifySymbol(`${base}-USD`)).toBe("CRYPTO");
    }
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
  it("translates every contract in the table", () => {
    for (const [tv, yahoo] of FUTURES_CONTRACTS) {
      expect(toYahooSymbol(tv)).toBe(yahoo);
    }
  });

  it("pairs every crypto base the owner knows", () => {
    // The old private YF_MAP covered eight bases and sent the other six to
    // Yahoo bare, which Yahoo does not resolve.
    for (const base of CRYPTO_BASES) {
      expect(toYahooSymbol(base)).toBe(`${base}-USD`);
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
    // An index IS carried — it was only falling through before because the
    // hand-typed predicate could not see it either way.
    expect(isUnsupportedByEquityVendors("^VIX")).toBe(false);
  });

  it("says NOT CARRIED rather than NO DATA", () => {
    // This is the whole user-facing point. "No data" means "try later".
    const reason = unsupportedAssetClassReason("NQ=F");
    expect(reason).not.toBeNull();
    expect(reason!.toLowerCase()).toContain("not carried here");
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
 * This guard caught its own author. The comment I wrote above the repaired
 * predicate in `/api/market` QUOTES the old one verbatim — that is the whole
 * point of the comment, so the next reader knows which defect was removed — and
 * a raw `toContain` scan read the quotation as the defect still being present.
 * The prose claim "comments are allowed to quote history" was true of the
 * intent and false of the executable check underneath it.
 *
 * Same defect class as `sentinelsHaveAMachine.test.ts` (a workflow's own header
 * comment kept a deleted `vitest` step looking wired) and
 * `repoFrontDoorAuthority.test.ts`. A document that DESCRIBES a thing is not a
 * document that DOES it — in either direction.
 */
function readCode(rel: string): string {
  return read(rel)
    .split("\n")
    .filter(line => !/^\s*(\/\/|\/\*|\*)/.test(line))
    .join("\n");
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
