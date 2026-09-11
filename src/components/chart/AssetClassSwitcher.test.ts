/**
 * The tab the picker opens on must not contradict the instrument the trader is
 * looking at, and must not contradict the menu this very component renders.
 */

import { describe, expect, it } from "vitest";
import { classOf } from "./AssetClassSwitcher";

describe("AssetClassSwitcher tab selection", () => {
  it("THE MEASURED FAILURE: one contract, two notations, two different tabs", () => {
    // `GC1!` was pinned to metals by a hand-typed list; `GC=F` fell through to
    // a futures predicate. Same gold contract, different tab.
    expect(classOf("GC=F")).toBe(classOf("GC1!"));
    expect(classOf("GC1!")).toBe("metals");
  });

  it("pins a contract that arrives in a notation the menu does not list", () => {
    // Gold spot is not on the menu; the notation owner resolves it to the
    // gold contract that IS, so it opens metals instead of falling through.
    expect(classOf("XAUUSD")).toBe("metals");
    expect(classOf("XAU/USD")).toBe("metals");
  });

  it("does not read the futures slash convention as a currency pair", () => {
    expect(classOf("/ES")).toBe("futures");
    expect(classOf("EUR/USD")).toBe("forex");
    expect(classOf("USD/JPY")).toBe("forex");
  });

  it("opens crypto on every notation the app's pickers emit", () => {
    for (const sym of ["BTC", "BTC-USD", "BTC.COINBASE", "ETH-USD", "DOGE"]) {
      expect(classOf(sym), `${sym} must open the crypto tab`).toBe("crypto");
    }
  });

  it("reads index notation as indices rather than as a stock", () => {
    expect(classOf("^VIX")).toBe("indices");
    expect(classOf("^GSPC")).toBe("indices");
  });

  it("opens every symbol the menu itself offers on the tab it is offered from", () => {
    // The pinning is DERIVED from `ASSET_CLASSES`, so this cannot drift: adding
    // a symbol to a tab pins it, with no second edit anywhere.
    const menu: Array<[string, string]> = [
      ["AAPL", "stocks"], ["NVDA", "stocks"],
      ["BTC", "crypto"], ["SOL", "crypto"],
      ["ES1!", "futures"], ["CL1!", "futures"],
      ["EUR/USD", "forex"], ["AUD/USD", "forex"],
      ["SPY", "indices"], ["VIX", "indices"], ["QQQ", "indices"],
      ["GC1!", "metals"], ["SI1!", "metals"], ["GLD", "metals"],
    ];
    for (const [sym, tab] of menu) {
      expect(classOf(sym), `${sym} is offered under ${tab}`).toBe(tab);
    }
  });

  it("still answers for a symbol it has never seen, without crashing or blanking", () => {
    // There is no "unrecognised" tab; the default is a MENU choice, and the
    // component must always have one to render.
    expect(classOf("NOTATICKERATALL")).toBe("stocks");
    expect(classOf("")).toBe("stocks");
  });
});
