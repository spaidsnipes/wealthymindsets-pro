/**
 * A search badge may not promise an instrument the chart will not show.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import {
  polygonCategory,
  reconcileSearchCategory,
  yahooQuoteTypeCategory,
  type SearchCategory,
} from "@/lib/marketData/searchResultCategory";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

describe("search result category", () => {
  it("never contradicts the class owner, on hits MEASURED from live Yahoo", () => {
    // Captured from query2.finance.yahoo.com/v1/finance/search on 2026-09-11
    // across the six classes the Founder asked to be exercised at once.
    const live: Array<[symbol: string, quoteType: string, expected: SearchCategory]> = [
      ["BTC-USD",    "CRYPTOCURRENCY", "Crypto"],
      ["BCH-USD",    "CRYPTOCURRENCY", "Crypto"],
      ["BTC=F",      "FUTURE",         "Futures"],
      ["MGC=F",      "FUTURE",         "Futures"],
      ["EURUSD=X",   "CURRENCY",       "Forex"],
      ["^VIX",       "INDEX",          "Index"],
      ["AAPL",       "EQUITY",         "Stock"],
      ["IBIT",       "ETF",            "ETF"],
      ["SPY",        "ETF",            "ETF"],
    ];

    for (const [sym, quoteType, expected] of live) {
      expect(
        reconcileSearchCategory(sym, yahooQuoteTypeCategory(quoteType)),
        `${sym} (Yahoo says ${quoteType})`,
      ).toBe(expected);
    }
  });

  it("lets the vendor REFINE an equity, because the owner cannot see a fund wrapper", () => {
    // `classifySymbol` answers EQUITY for both; only the vendor knows which is
    // a wrapper. This is the single refinement the vendor is permitted.
    expect(classifySymbol("IBIT")).toBe("EQUITY");
    expect(reconcileSearchCategory("IBIT", "ETF")).toBe("ETF");
    expect(reconcileSearchCategory("VFIAX", "Fund")).toBe("Fund");
    expect(reconcileSearchCategory("AAPL", "Stock")).toBe("Stock");
  });

  it("REFUSES a vendor that contradicts the owner rather than trusting the field", () => {
    // The whole point. If a vendor called the VIX cash index a future, the
    // badge would promise a contract the chart does not load — `VX1!`
    // resolves to `^VIX` in this app.
    expect(reconcileSearchCategory("^VIX", "Futures")).toBe("Index");
    expect(reconcileSearchCategory("VX1!", "Futures")).toBe("Index");
    expect(reconcileSearchCategory("BTC-USD", "Stock")).toBe("Crypto");
    expect(reconcileSearchCategory("EURUSD=X", "Stock")).toBe("Forex");
    // A vendor may not promote a futures contract to a fund either — the
    // refinement is allowed INSIDE equity only.
    expect(reconcileSearchCategory("GC=F", "ETF")).toBe("Futures");
  });

  it("uses the vendor where the owner has NO opinion, since UNKNOWN is not a claim", () => {
    // Real listings whose notation the owner does not parse. Dropping these
    // would hide tradable instruments from search entirely.
    expect(classifySymbol("MGCV26.CMX")).toBe("UNKNOWN");
    expect(reconcileSearchCategory("MGCV26.CMX", "Futures")).toBe("Futures");
    expect(reconcileSearchCategory("AAPL.TO", "Stock")).toBe("Stock");
    expect(reconcileSearchCategory("18QQ.Z", "Index")).toBe("Index");
  });

  it("still returns a renderable badge when the vendor says nothing we recognise", () => {
    // There is no "unrecognised" badge and a blank one would look like a bug.
    expect(reconcileSearchCategory("WHATEVER123", null)).toBe("Stock");
    expect(yahooQuoteTypeCategory("ECNQUOTE")).toBeNull();
    expect(yahooQuoteTypeCategory(undefined)).toBeNull();
  });

  it("reads both vendor vocabularies into the same one", () => {
    expect(polygonCategory("fx", "")).toBe("Forex");
    expect(yahooQuoteTypeCategory("CURRENCY")).toBe("Forex");
    expect(polygonCategory("crypto", "")).toBe("Crypto");
    expect(yahooQuoteTypeCategory("CRYPTOCURRENCY")).toBe("Crypto");
    expect(polygonCategory("stocks", "cs")).toBe("Stock");
    expect(yahooQuoteTypeCategory("EQUITY")).toBe("Stock");
    expect(polygonCategory("", "unheard_of")).toBeNull();
  });
});

describe("the search route survives a missing provider key", () => {
  const route = fs.readFileSync(
    path.join(REPO_ROOT, "src/app/api/symbol-search/route.ts"),
    "utf8",
  );

  it("does not return 503 merely because POLYGON_KEY is absent", () => {
    // MEASURED: POLYGON_KEY is unset on the Cloudflare runtime, and this route
    // used to answer every query with 503 because of it. One unset secret took
    // out search for all six asset classes, and the keyless vendor below was
    // always reachable. "No website or provider stops ATH."
    expect(
      route,
      "the early `if (!POLYGON_KEY) return 503` bail must not come back",
    ).not.toMatch(/if\s*\(\s*!POLYGON_KEY\s*\)/);
    expect(route).toMatch(/yahooSearch/);
  });

  it("names which vendor answered, so a caller need not infer it", () => {
    expect(route).toMatch(/vendor:\s*"polygon"/);
    expect(route).toMatch(/vendor:\s*"yahoo"/);
    expect(route).toMatch(/degraded:/);
  });

  it("keeps an honest UNAVAILABLE for the case where BOTH vendors fail", () => {
    // Degrading is not the same as pretending. Losing both is still an outage
    // and must still be sayable.
    expect(route).toMatch(/edge:\s*"UNAVAILABLE"/);
    expect(route).toMatch(/vendorsTried/);
  });

  it("asks the category owner instead of reading a vendor field into the badge", () => {
    expect(route).toMatch(/reconcileSearchCategory/);
    expect(route, "the private vendor-vocabulary map must stay deleted").not.toMatch(
      /function marketToCategory/,
    );
  });
});

describe("the picker does not turn an app failure into a claim about the market", () => {
  const picker = fs.readFileSync(
    path.join(REPO_ROOT, "src/components/ui/SymbolSearch.tsx"),
    "utf8",
  );

  it("stops swallowing the route's error", () => {
    // The route names the exact missing variable; this component discarded it
    // and rendered "No results for X" — the app's failure, stated as a fact
    // about the market. `catch { }` with nothing in it is how that happened.
    expect(picker, "an empty catch here re-buries the reason").not.toMatch(
      /catch\s*\{\s*\/\*\s*ignore\s*\*\/\s*\}/,
    );
    expect(picker).toMatch(/setLiveFailure/);
  });

  it("says WHICH sentence it is saying", () => {
    expect(picker).toMatch(/Live search unavailable/);
    expect(picker).toMatch(/No built-in symbol matches/);
  });

  it("runs its BUILT-IN list through the same reconciliation as the live one", () => {
    // Two halves of one dropdown, visible at the same moment. If only the
    // live half asks the owner, the trader can watch them disagree.
    expect(picker).toMatch(/RAW_LOCAL_SYMBOLS/);
    expect(picker).toMatch(/reconcileSearchCategory\(s\.sym/);
  });

  it("corrects every built-in badge that contradicted the owner", () => {
    // Parsed from the component's real list, so this cannot drift from what
    // ships. These three were MEASURED wrong on 2026-09-11.
    const raw = new Map<string, string>();
    const re = /\{\s*sym:\s*"([^"]+)",\s*label:\s*"([^"]*)",\s*cat:\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(picker))) raw.set(m[1], m[3]);

    // Contradictions the owner must overrule.
    expect(reconcileSearchCategory("VX1!", raw.get("VX1!") as SearchCategory)).toBe("Index");
    expect(reconcileSearchCategory("XAUUSD", raw.get("XAUUSD") as SearchCategory)).toBe("Futures");
    expect(reconcileSearchCategory("XAGUSD", raw.get("XAGUSD") as SearchCategory)).toBe("Futures");

    // A row may not promise a contract the app will not load. `VX1!` charts
    // the cash index, so its label may not call itself futures.
    const vixLabel = [...picker.matchAll(re)].find((x) => x[1] === "VX1!")?.[2] ?? "";
    expect(vixLabel, "VX1! loads ^VIX; the label must not say 'Futures'").not.toMatch(/futures/i);
  });

  it("KEEPS the curator where it is legitimately better informed", () => {
    // Refinement inside equity — the owner cannot see a fund wrapper.
    expect(reconcileSearchCategory("SPY", "ETF")).toBe("ETF");
    expect(reconcileSearchCategory("TQQQ", "ETF")).toBe("ETF");
  });

  it("leaves the DISCLOSED CFD gap disclosed instead of badging around it", () => {
    // US30/US500/US100/USOIL/UKOIL are offered by the picker and answer
    // {"error":"No data"} — MEASURED this session. It is tempting to map them
    // to ^DJI/^GSPC/^NDX/CL=F/BZ=F, which all return live prices, and that was
    // tried and reverted: see yahooSymbol.ts. A near-neighbour presented as
    // the instrument asked for is a worse defect than a blank chart, because
    // the trader cannot see it happen.
    //
    // So the curator's "Forex" badge stands where the owner has no opinion,
    // and the rows stay honestly broken until they are sourced or withdrawn.
    expect(classifySymbol("US30")).toBe("UNKNOWN");
    expect(reconcileSearchCategory("US30", "Forex")).toBe("Forex");
  });
});
