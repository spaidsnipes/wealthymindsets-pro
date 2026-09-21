import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  quoteSourceNamesProvider,
  QUOTE_SOURCE_NAMES_PROVIDER_VERSION,
} from "./quoteSourceNamesProvider";

describe("quoteSourceNamesProvider — does this string NAME someone to check against?", () => {
  it("× THE MANUFACTURED CITATION: a refusal-to-vouch sentinel is not a vendor", () => {
    // MEASURED on the serving host 2026-09-20:
    //   BTCUSDT · 5m · 81781.82 LAST QUOTE · unavailable
    // `unavailable` is useWebSocket's initial value for MarketState["source"]:
    // Finnhub returned no observation time, finnhubQuoteObservedAt returned
    // null, and the quote-apply site DELIBERATELY left source unpromoted.
    // Printing it after "LAST QUOTE ·" turns a refusal into a citation.
    for (const s of ["unavailable", "unknown", "none", "null", "undefined", "n/a", "na", "-", "—", "?"]) {
      expect(quoteSourceNamesProvider(s), `sentinel ${JSON.stringify(s)}`).toBe(false);
    }
  });

  it("is not case- or whitespace-fooled", () => {
    for (const s of ["UNAVAILABLE", " unavailable ", "Unknown", "\tN/A\n"]) {
      expect(quoteSourceNamesProvider(s), JSON.stringify(s)).toBe(false);
    }
  });

  it("an empty or non-string slot names nobody", () => {
    for (const s of ["", "   ", null, undefined, 0, 81781.82, {}, [], NaN]) {
      expect(quoteSourceNamesProvider(s), JSON.stringify(s)).toBe(false);
    }
  });

  it("a real vendor passes — and is NOT thereby judged good, current, or entitled", () => {
    for (const s of ["finnhub", "polygon", "binance", "coinbase", "alpaca", "moomoo", "Yahoo"]) {
      expect(quoteSourceNamesProvider(s), s).toBe(true);
    }
  });

  it("does not reject a vendor merely for CONTAINING a sentinel word", () => {
    // The rule is exact-match, not substring. A hypothetical vendor named
    // "unknown-labs" has given the trader a name to check.
    expect(quoteSourceNamesProvider("unknown-labs")).toBe(true);
    expect(quoteSourceNamesProvider("data-unavailable-inc")).toBe(true);
  });

  it("is versioned so a drifting copy can be told from the original", () => {
    expect(QUOTE_SOURCE_NAMES_PROVIDER_VERSION).toBe("wm.quote-source-names-provider.v1");
  });
});

describe("× TWO OWNERS, ONE PIXEL: both surfaces ask this module, not themselves", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("the spine no longer carries its own inline sentinel list", () => {
    const src = read("src/lib/marketData/formatSpinePrice.ts");
    expect(src, "formatSpinePrice does not consult the shared owner").toContain(
      "quoteSourceNamesProvider",
    );
    expect(src, "a second inline sentinel set has reappeared").not.toMatch(
      /new Set\(\[\s*"unavailable"/,
    );
  });

  it("the chart header asks the same module the spine asks", () => {
    const src = read("src/lib/marketData/chartHeaderPriceFact.ts");
    expect(src).toContain("quoteSourceNamesProvider");
    expect(src, "a second inline sentinel set has appeared in the header").not.toMatch(
      /new Set\(\[\s*"unavailable"/,
    );
  });
});
