/**
 * TYPED SYMBOL → CHART SYMBOL (serving 2026-10-06: /charts?symbol=NQ refused
 * at all five bar doors while NQ1! charted). Every alias must land on a symbol
 * a bar door serves; every already-canonical symbol must pass through as-is.
 */
import { describe, expect, it } from "vitest";
import { BARE_ROOTS_LISTED_AS_SECURITIES, FUTURES_YAHOO_NOTATIONS, resolveEnteredSymbol } from "./futuresNotation";
import { normalizeMarketSurfaceSymbol, marketSurfaceUrlWriteback } from "@/lib/routing/marketSurfaceQuery";
import { classifySymbol } from "./symbolAssetClass";
import { resolveYahooSymbol, toYahooSymbol } from "@/lib/yahooSymbol";
import { canonicalAssetClass } from "./canonicalIdentity";

const ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["NQ", "NQ1!"], ["nq", "NQ1!"], [" Nq ", "NQ1!"], ["/NQ", "NQ1!"], ["/nq", "NQ1!"], ["NQ=F", "NQ1!"],
  ["MNQ", "MNQ1!"], ["/MNQ", "MNQ1!"], ["MES", "MES1!"], ["YM", "YM1!"], ["MYM", "MYM1!"],
  ["RTY", "RTY1!"], ["M2K", "M2K1!"], ["GC", "GC1!"], ["/GC", "GC1!"], ["MCL", "MCL1!"],
  ["ZB", "ZB1!"], ["ZN", "ZN1!"], ["ZF", "ZF1!"], ["ZT", "ZT1!"], ["ZC", "ZC1!"], ["ZW", "ZW1!"],
  ["PA", "PA1!"], ["6E", "6E1!"], ["6J", "6J1!"], ["6B", "6B1!"],
  // The slash is the broker's futures mark: even an ambiguous root is the future.
  ["/ES", "ES1!"], ["/es", "ES1!"], ["/CL", "CL1!"], ["ES=F", "ES1!"], ["CL=F", "CL1!"],
];

const UNCHANGED: readonly string[] = [
  // Already canonical continuous series.
  ...Object.keys(FUTURES_YAHOO_NOTATIONS),
  // Dated executable contracts stay the month they name.
  "/NQZ6", "NQZ6", "/MNQH7", "ESZ6",
  // Bare roots that are real listed securities (measured) stay the security.
  ...BARE_ROOTS_LISTED_AS_SECURITIES,
  // Not futures at all, or roots WM does not table — never guessed at.
  "BTC", "ETH", "SPX", "NDX", "TSLA", "AAPL", "EURUSD", "EUR/USD", "^VIX", "/BTC", "BTC-USD", "XAUUSD",
];

describe("resolveEnteredSymbol — aliases land on the continuous series", () => {
  it.each(ALIASES)("%s → %s", (input, out) => {
    expect(resolveEnteredSymbol(input)).toBe(out);
  });

  it.each(ALIASES)("%s resolves to a futures symbol Yahoo serves as =F", (input) => {
    const s = resolveEnteredSymbol(input);
    expect(classifySymbol(s)).toBe("FUTURES");
    expect(canonicalAssetClass(s)).toBe("futures");
    const y = resolveYahooSymbol(s);
    expect(y.kind).toBe("RESOLVED");
    expect(y.kind === "RESOLVED" && y.ticker).toMatch(/^[A-Z0-9]{1,4}=F$/);
  });

  it("is idempotent", () => {
    for (const [input] of ALIASES) {
      const once = resolveEnteredSymbol(input);
      expect(resolveEnteredSymbol(once)).toBe(once);
    }
  });
});

describe("resolveEnteredSymbol — canonical and ambiguous symbols are untouched", () => {
  it.each(UNCHANGED)("%s passes through", (sym) => {
    expect(resolveEnteredSymbol(sym)).toBe(sym);
  });

  it("only uppercases otherwise", () => {
    expect(resolveEnteredSymbol("tsla")).toBe("TSLA");
    expect(resolveEnteredSymbol("es")).toBe("ES");
    expect(resolveEnteredSymbol("nq1!")).toBe("NQ1!");
  });

  it("every listed-security exception is a tabled root (no dead rows)", () => {
    for (const r of BARE_ROOTS_LISTED_AS_SECURITIES) expect(FUTURES_YAHOO_NOTATIONS[`${r}1!`]).toBe(`${r}=F`);
  });
});

describe("the URL / deep-link gate uses the same resolution", () => {
  it.each(ALIASES)("?symbol=%s seeds %s", (input, out) => {
    expect(normalizeMarketSurfaceSymbol(input)).toBe(out);
  });

  it("canonical deep links are unchanged; junk is still rejected", () => {
    expect(normalizeMarketSurfaceSymbol("NQ1!")).toBe("NQ1!");
    expect(normalizeMarketSurfaceSymbol("/MNQH7")).toBe("/MNQH7");
    expect(normalizeMarketSurfaceSymbol("es")).toBe("ES");
    expect(normalizeMarketSurfaceSymbol("<script>")).toBeNull();
    expect(normalizeMarketSurfaceSymbol("")).toBeNull();
  });

  it("the URL is rewritten to say what is on the glass", () => {
    expect(marketSurfaceUrlWriteback("?symbol=NQ", "NQ1!", null)).toBe("?symbol=NQ1%21");
  });
});

describe("Yahoo owner: a broker futures root is not a forex pair", () => {
  it("/NQ asks Yahoo for NQ=F, never NQ=X", () => {
    expect(toYahooSymbol("/NQ")).toBe("NQ=F");
    expect(toYahooSymbol("/6E")).toBe("6E=F");
  });
  it("unknown slash roots and real FX pairs are unchanged", () => {
    expect(toYahooSymbol("EUR/USD")).toBe("EURUSD=X");
    expect(toYahooSymbol("/BTC")).not.toBe("BTC=F");
  });
});
