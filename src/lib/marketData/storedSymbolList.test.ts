/**
 * storedSymbolList — one rule for reading an untrusted stored symbol list.
 *
 * The measured failure first: `{"My Watchlist":["AAPL",42,"NVDA"]}` in
 * localStorage destroyed the entire <WatchlistPanel> via its ErrorBoundary,
 * taking two perfectly readable symbols off the screen with it.
 */

import { describe, expect, it } from "vitest";
import {
  normalizeSymbol,
  readStoredSymbolList,
  readSymbolList,
  withSymbol,
  withoutSymbol,
} from "./storedSymbolList";

describe("storedSymbolList — one bad entry does not cost the trader his list", () => {
  it("THE MEASURED FAILURE: keeps the readable symbols beside the junk one", () => {
    // Observed on /charts: `TypeError: sym.toUpperCase is not a function`,
    // ×16, "The above error occurred in the <WatchlistPanel> component. It was
    // handled by the <ErrorBoundary> error boundary." AAPL and NVDA vanished.
    expect(readSymbolList(["AAPL", 42, "NVDA"])).toEqual(["AAPL", "NVDA"]);
  });

  it("drops every shape that was never a symbol", () => {
    expect(readSymbolList(["AAPL", null, undefined, {}, [], true, "NVDA"])).toEqual([
      "AAPL",
      "NVDA",
    ]);
  });

  it("does not INVENT a symbol from a non-string", () => {
    // The rejected alternative was `String(s).toUpperCase()`, which is what the
    // watchlist's import path did: it never fails, it fabricates. 42 is not the
    // symbol "42" and {} is not "[OBJECT OBJECT]" — no feed can answer either
    // and the trader chose neither.
    // A readable symbol rides along so the result is a list to inspect rather
    // than the null an all-junk input would give.
    const read = readSymbolList(["AAPL", 42, {}, null, true, undefined, ["NVDA"]]);
    expect(read).toEqual(["AAPL"]);
    for (const invented of ["42", "[OBJECT OBJECT]", "TRUE", "NULL", "UNDEFINED", "NVDA"]) {
      expect(read, `must not fabricate ${invented}`).not.toContain(invented);
    }
  });

  it("returns null — not an empty list — when nothing is readable", () => {
    // An empty array would be a claim: "the trader chose to watch nothing."
    // null is "no readable preference", which the caller answers with its
    // default. §14.1: do not resolve an unreadable value into a confident one.
    expect(readSymbolList([])).toBeNull();
    expect(readSymbolList([42, null, {}])).toBeNull();
    expect(readSymbolList(["  ", ""])).toBeNull();
  });

  it("returns null for a value that is not a list at all", () => {
    // The watchlist's old reader passed a non-array straight through, so
    // `symbols.filter(...)` downstream had no array to filter.
    for (const value of [null, undefined, 42, "AAPL", {}, { 0: "AAPL" }, true]) {
      expect(readSymbolList(value), `value=${JSON.stringify(value)}`).toBeNull();
    }
  });

  it("preserves the trader's order and collapses duplicates to the first", () => {
    expect(readSymbolList(["ETH", "AAPL", "eth", "NQ1!"])).toEqual(["ETH", "AAPL", "NQ1!"]);
  });

  it("normalises case and padding so one instrument is one row", () => {
    expect(readSymbolList([" aapl ", "AAPL", "Aapl"])).toEqual(["AAPL"]);
  });
});

describe("storedSymbolList — reading raw bytes never throws", () => {
  it("parses a good document", () => {
    expect(readStoredSymbolList('["AAPL","NVDA"]')).toEqual(["AAPL", "NVDA"]);
  });

  it("answers null for bytes that are not a list", () => {
    for (const raw of [null, undefined, "", "not json", "{}", '"AAPL"', "42", "null", "["]) {
      expect(readStoredSymbolList(raw as string | null), `raw=${String(raw)}`).toBeNull();
    }
  });
});

describe("storedSymbolList — add and remove use the same rule as the reader", () => {
  it("adds a normalised symbol", () => {
    expect(withSymbol(["AAPL"], " nvda ")).toEqual(["AAPL", "NVDA"]);
  });

  it("returns the SAME array when there is nothing to add", () => {
    const list = ["AAPL"];
    for (const value of ["", "   ", null, undefined, 42, {}, "aapl"]) {
      expect(withSymbol(list, value)).toBe(list);
    }
  });

  it("removes by the same normalisation it added by", () => {
    // Removal that did not normalise would leave a row the X button could not
    // delete.
    expect(withoutSymbol(["AAPL", "NVDA"], " aapl ")).toEqual(["NVDA"]);
  });

  it("returns the SAME array when there is nothing to remove", () => {
    const list = ["AAPL"];
    expect(withoutSymbol(list, "TSLA")).toBe(list);
    expect(withoutSymbol(list, 42)).toBe(list);
  });

  it("a symbol added then removed leaves the list exactly as it was", () => {
    const list = ["NQ1!", "AAPL"];
    expect(withoutSymbol(withSymbol(list, "amd"), "AMD")).toEqual(list);
  });
});

describe("storedSymbolList — normalizeSymbol is the shared primitive", () => {
  it("answers null for anything that is not text", () => {
    for (const value of [null, undefined, 42, {}, [], true, NaN]) {
      expect(normalizeSymbol(value), JSON.stringify(value)).toBeNull();
    }
  });

  it("trims and uppercases text", () => {
    expect(normalizeSymbol("  eur ")).toBe("EUR");
  });
});
