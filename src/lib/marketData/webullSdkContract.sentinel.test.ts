/**
 * THE THREE-MONTH BUG, MADE UNABLE TO COME BACK QUIETLY.
 *
 * WM Pro sent its Webull tick read to a path that did not exist, at a version
 * that did not apply, for roughly three months. Webull answered
 * MARKET_DATA_NOT_SUBSCRIBED — a code that names a subscription — so the
 * conclusion every reader drew was "the Founder needs to buy market data". He
 * had bought it. The request was malformed.
 *
 * Two things made that survivable for months, and this file attacks both:
 *
 *   1. THE PATH HAD NO OWNER. It was a bare string literal at its use site, so
 *      "is this right?" had no place to be answered. Now `webullSdkContract.ts`
 *      owns every Webull path and version, and each row cites the SDK file it
 *      was transcribed from. This sentinel fails if a Webull production module
 *      hard-codes a path again.
 *
 *   2. A COMMENT ASSERTED THE WRONG ANSWER AS FACT. The old note claimed the
 *      broken path was "Webull's current official SDK request contract" and
 *      that the correct one "returns an access-looking failure". Both false,
 *      both uncited, both stated with total confidence — and that is exactly
 *      why nobody re-checked. A guard cannot make a comment true, but it can
 *      make sure the values the comment describes have a cited home.
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT. It proves single ownership and the
 * presence of a citation. It does NOT prove the citation is accurate — no test
 * in this repo can open Webull's SDK on someone else's disk. Verifying a row
 * means reading the named file. The guard's job is to make sure a reader knows
 * WHICH file to open, instead of trusting a sentence.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { WEBULL_CONTRACT_ROWS, WEBULL_SDK_CONTRACT } from "./webullSdkContract";

const SRC = join(process.cwd(), "src");
const CONTRACT_MODULE = join("marketData", "webullSdkContract.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Strips block and line comments so a path NAMED in prose is not read as a
 *  hard-coded path. The old defect lived in a comment; discussing it in one
 *  must stay legal, or the fix would have to delete its own explanation. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Webull PRODUCTION modules: not tests, not the contract module itself. */
const webullSources = walk(SRC)
  .filter((file) => /webull/i.test(file))
  .filter((file) => !/\.test\.tsx?$/.test(file))
  .filter((file) => !file.endsWith(CONTRACT_MODULE))
  .map((file) => ({ file: file.slice(SRC.length + 1), code: stripComments(readFileSync(file, "utf8")) }));

/** A string literal that looks like a Webull REQUEST path. */
const PATH_LITERAL = /["'`](\/(?:openapi|trading|market-data|quotes)\/[A-Za-z0-9/_-]*)["'`]/g;

describe("every Webull request path comes from the cited SDK contract", () => {
  it("is actually scanning Webull production files", () => {
    // Guards the guard. If the walk returns nothing — a rename, a moved
    // directory — every assertion below would pass over an empty set and this
    // file would go green while protecting nothing.
    expect(webullSources.length).toBeGreaterThanOrEqual(3);
    expect(webullSources.map((s) => s.file)).toContain(join("lib", "marketData", "adapters", "webullMarketData.ts"));
    expect(webullSources.map((s) => s.file)).toContain(join("lib", "marketData", "webullEntitlementProbe.ts"));
    expect(webullSources.map((s) => s.file)).toContain(join("lib", "broker", "adapters", "webullBrokerConnection.ts"));
  });

  it("no Webull module hard-codes a request path", () => {
    const offenders = webullSources.flatMap(({ file, code }) =>
      Array.from(code.matchAll(PATH_LITERAL)).map((match) => `${file}: ${match[1]}`),
    );

    expect(
      offenders,
      "a Webull request path was written as a literal instead of read from " +
        "webullSdkContract.ts. That is precisely how this repo shipped " +
        "/openapi/market-data/stock/tick for three months and then blamed the " +
        "Founder's subscription for the 403. Add the endpoint to the contract " +
        "with the SDK file you read it from, and import it",
    ).toEqual([]);
  });

  it("every contract row cites a real-looking SDK file", () => {
    for (const row of WEBULL_CONTRACT_ROWS) {
      expect(row.sdkSource, `${row.path} has no SDK citation`).toMatch(/^webull\/[a-z0-9/_]+\.py$/);
      expect(row.path.startsWith("/"), `${row.path} is not a path`).toBe(true);
      expect(row.apiVersion).toMatch(/^v\d+$/);
    }
  });

  it("keeps the tick endpoint pinned to the path that actually exists", () => {
    // The specific values that were wrong. Named, so a 'restore' shows up as a
    // deliberate act in a diff rather than a silent regression.
    expect(WEBULL_SDK_CONTRACT.STOCK_TICKS.path).toBe("/market-data/stocks/ticks/list");
    expect(WEBULL_SDK_CONTRACT.STOCK_TICKS.apiVersion).toBe("v3");
    expect(WEBULL_SDK_CONTRACT.STOCK_TICKS.path).not.toContain("/openapi/");
    expect(WEBULL_SDK_CONTRACT.STOCK_TICKS.path).not.toBe("/openapi/market-data/stock/tick");
  });

  it("keeps at least one non-market-data endpoint, or the entitlement probe cannot isolate anything", () => {
    // The probe's whole method is comparing gated rungs against ungated ones
    // over identical credentials. Delete the ungated rows and its verdict
    // silently degrades from proof to assertion.
    expect(WEBULL_CONTRACT_ROWS.filter((row) => !row.needsMarketData).length).toBeGreaterThan(0);
    expect(WEBULL_CONTRACT_ROWS.filter((row) => row.needsMarketData).length).toBeGreaterThan(0);
  });
});
