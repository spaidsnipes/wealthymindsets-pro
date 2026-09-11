import { describe, expect, it } from "vitest";

import { FABIO_INSIGHTS, getFabioInsights, inferAssetClass } from "./fabio";
import { classifySymbol } from "./marketData/symbolAssetClass";

describe("Fabio order-flow truth language", () => {
  it("does not turn observation into participant identity or certainty", () => {
    const copy = FABIO_INSIGHTS.map(({ title, body, action }) => `${title} ${body} ${action}`).join(" ");
    expect(copy).not.toContain("a large player is filling passively");
    expect(copy).not.toContain("conviction, not noise");
    expect(copy).not.toContain("Fade the edges");
    expect(copy).toContain("not proof of who is trading");
    expect(copy).toContain("not a reversal guarantee");
    expect(copy).toContain("not automatic magnets or reversal signals");
  });
});

/**
 * `inferAssetClass` decides WHICH PLAYBOOK a trader is shown. A wrong answer
 * here is not a mislabel — it hands a crypto trader the opening-bell insight
 * for a market that has no bell.
 *
 * Written against the symbols the PRODUCT emits, not against the ones the old
 * predicate happened to handle. That is the whole reason the defect survived:
 * `["BTC", "ETH", …].includes(s)` is correct for a string no picker sends.
 */
describe("Fabio playbook routing follows the class owner", () => {
  it("THE MEASURED FAILURE: the app's own crypto symbols reached the stocks playbook", () => {
    for (const symbol of ["BTC-USD", "ETH-USD", "SOL-USD"]) {
      expect(inferAssetClass(symbol), `${symbol} must route to the crypto playbook`).toBe("crypto");
    }
    // And the consequence the trader actually saw. Asked at the size the
    // surfaces really ask for (SmartMoneyPanel and FabioInsights both request
    // three), BTC-USD got the opening-range insight for a market with no open,
    // and did not get the crypto playbook at all.
    //
    // Note the selector RANKS, it does not filter — so this is asserted at a
    // real call size rather than by demanding exclusion from a request for
    // every insight there is, which would be a different change to a different
    // module.
    const titles = getFabioInsights({ symbol: "BTC-USD" }, 3).map((i) => i.title);
    expect(titles).toContain("Crypto has no bell — use funding & liquidations");
    expect(titles).not.toContain("First 30 min sets the range");
  });

  it("does not read the futures slash convention as a currency pair", () => {
    // `/ES` contains a slash. The old rule called that forex — the identical
    // bug `classifySymbol` orders its rules to avoid.
    expect(inferAssetClass("/ES")).toBe("futures");
    expect(inferAssetClass("EUR/USD")).toBe("forex");
    expect(inferAssetClass("EURUSD=X")).toBe("forex");
  });

  it("does not hand an equity ticker the precious-metals macro playbook", () => {
    // `startsWith("SI")` gave Sirius XM the gold-and-real-yields insight.
    expect(inferAssetClass("SIRI")).toBe("stocks");
    expect(inferAssetClass("GCT")).toBe("stocks");
    expect(getFabioInsights({ symbol: "SIRI" }, 3).map((i) => i.id)).not.toContain("metals-macro");
  });

  it("still recognises metals through every notation that names them", () => {
    for (const symbol of ["XAUUSD", "XAU/USD", "GC1!", "GC=F", "SI1!"]) {
      expect(inferAssetClass(symbol), `${symbol} is a metals contract`).toBe("metals");
    }
  });

  it("agrees with the class owner for every symbol it is given", () => {
    // The mapping is allowed to be COARSER than the owner (metals is a subset
    // of futures; index has no member here) but never to CONTRADICT it.
    const coarser: Record<string, string[]> = {
      CRYPTO: ["crypto"], FUTURES: ["futures", "metals"], FOREX: ["forex"],
      EQUITY: ["stocks"], INDEX: ["stocks"], UNKNOWN: ["any"],
    };
    for (const symbol of [
      "AAPL", "TSLA", "SIRI", "BTC-USD", "ETH-USD", "NQ1!", "NQ=F", "/ES",
      "GC1!", "XAUUSD", "EURUSD=X", "EUR/USD", "^VIX", "^GSPC", "NOTATICKERATALL",
    ]) {
      expect(
        coarser[classifySymbol(symbol)],
        `${symbol}: fabio says ${inferAssetClass(symbol)}, the owner says ${classifySymbol(symbol)}`,
      ).toContain(inferAssetClass(symbol));
    }
  });

  it("gives an absent symbol no asset-specific playbook rather than a guessed one", () => {
    expect(inferAssetClass(undefined)).toBe("any");
    expect(inferAssetClass("")).toBe("any");
  });
});
