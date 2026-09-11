/**
 * tapeSymbols — the trader's tape is a list the trader owns.
 *
 * The measured failure first: a symbol the hardcoded catalogue had never heard
 * of was kept by the editor and dropped by the rail, both on screen at once.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAPE_SYMBOLS,
  TAPE_SYMBOL_SUGGESTIONS,
  normalizeTapeSymbol,
  readStoredTapeSymbols,
  tapeQuoteBlocker,
  withTapeSymbol,
  withoutTapeSymbol,
} from "./tapeSymbols";
import { toYahooSymbol } from "@/lib/yahooSymbol";

describe("tapeSymbols — the stored tape survives a reload", () => {
  it("keeps a symbol the default list has never heard of", () => {
    // THE MEASURED FAILURE. Stored ["NQ1!","AMD","AAPL"], the rail rendered
    // NQ1! and AAPL. AMD is not in DEFAULT_TAPE_SYMBOLS and must survive anyway
    // — the default is a default, never an allowlist.
    expect(DEFAULT_TAPE_SYMBOLS).not.toContain("AMD");
    expect(readStoredTapeSymbols('["NQ1!","AMD","AAPL"]')).toEqual(["NQ1!", "AMD", "AAPL"]);
  });

  it("keeps a symbol that appears in no list in this repository", () => {
    // The catalogue fix would have been to add AMD. This is the symbol after
    // AMD: on no default, on no suggestion list, typed by a trader who knows
    // what he wants to watch.
    const exotic = "MNQ1!";
    expect(TAPE_SYMBOL_SUGGESTIONS).not.toContain(exotic);
    expect(readStoredTapeSymbols(`["${exotic}"]`)).toEqual([exotic]);
  });

  it("preserves the trader's order — the tape is not re-sorted under him", () => {
    expect(readStoredTapeSymbols('["ETH","AAPL","NQ1!"]')).toEqual(["ETH", "AAPL", "NQ1!"]);
  });

  it("normalises case and padding so one instrument is one row", () => {
    expect(readStoredTapeSymbols('[" aapl ","AAPL","Aapl"]')).toEqual(["AAPL"]);
  });
});

describe("tapeSymbols — a corrupt stored list does not take the rail down", () => {
  it("drops an entry that was never a symbol and keeps the rest", () => {
    // fetchQuote calls sym.toUpperCase() outside its try, inside a Promise.all.
    // One non-string entry rejected the whole fetch round, so every symbol on
    // the rail stopped updating — not just the bad one.
    expect(readStoredTapeSymbols('["AAPL",42,"NVDA"]')).toEqual(["AAPL", "NVDA"]);
    expect(readStoredTapeSymbols('["AAPL",null,{},[],"NVDA"]')).toEqual(["AAPL", "NVDA"]);
  });

  it("returns null — not an empty tape — when nothing in the list is readable", () => {
    // An empty array would be a claim: "the trader chose to watch nothing."
    // null is "no readable preference", which the caller answers with the
    // default. §14.1: do not resolve an unreadable value into a confident one.
    expect(readStoredTapeSymbols("[]")).toBeNull();
    expect(readStoredTapeSymbols('[42,null,{}]')).toBeNull();
    expect(readStoredTapeSymbols('["   ",""]')).toBeNull();
  });

  it("returns null for bytes that are not a list at all", () => {
    for (const raw of [null, undefined, "", "not json", "{}", '"AAPL"', "42", "null"]) {
      expect(readStoredTapeSymbols(raw as string | null), `raw=${String(raw)}`).toBeNull();
    }
  });
});

describe("tapeSymbols — add and remove are the same rule the reader uses", () => {
  it("adds a normalised symbol", () => {
    expect(withTapeSymbol(["AAPL"], " nvda ")).toEqual(["AAPL", "NVDA"]);
  });

  it("returns the SAME array when the symbol is already on the tape", () => {
    const tape = ["AAPL", "NVDA"];
    expect(withTapeSymbol(tape, "aapl")).toBe(tape);
  });

  it("returns the SAME array when there is no symbol to add", () => {
    const tape = ["AAPL"];
    for (const value of ["", "   ", null, undefined, 42, {}]) {
      expect(withTapeSymbol(tape, value)).toBe(tape);
    }
  });

  it("removes by the same normalisation it added by", () => {
    // Removal that did not normalise would leave a row the editor's own X
    // button could not delete.
    expect(withoutTapeSymbol(["AAPL", "NVDA"], " aapl ")).toEqual(["NVDA"]);
  });

  it("returns the SAME array when there is nothing to remove", () => {
    const tape = ["AAPL"];
    expect(withoutTapeSymbol(tape, "TSLA")).toBe(tape);
    expect(withoutTapeSymbol(tape, 42)).toBe(tape);
  });

  it("a symbol added then removed leaves the tape exactly as it was", () => {
    const tape = ["NQ1!", "AAPL"];
    expect(withoutTapeSymbol(withTapeSymbol(tape, "amd"), "AMD")).toEqual(tape);
  });
});

describe("tapeSymbols — the tape does not offer what it cannot serve", () => {
  it("THE MEASURED FAILURE: a suggested pair sat at 'quote pending' forever", () => {
    // Measured in the running app with stored ["AAPL","EUR/USD"]:
    //   AAPL     320.01  -8.20 (-2.50%)
    //   EUR/USD  quote pending          <- a request that was never sent
    // Naming that boundary was right. The REASON attached to it was not.
    expect(tapeQuoteBlocker("EUR/USD")).toBeNull();
    expect(TAPE_SYMBOL_SUGGESTIONS).toContain("EUR/USD");
  });

  it("THE SECOND FAILURE: the tape disowned a feed that already worked", () => {
    // `03deb2c` (09-07) wrote "no forex feed on the tape" from fetchQuote's
    // branch shape. `b90886f` (09-06) had already taught the resolver
    // EUR/USD -> EURUSD=X. The notice was one day younger than the capability.
    //
    // Measured against the running route, every offered pair RESOLVED/OBSERVED
    // with a real prevClose — USD/JPY 154.468994 at 3.7s old, while the US
    // equity session was closed and FX was the class actually trading.
    for (const pair of ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]) {
      expect(tapeQuoteBlocker(pair), pair).toBeNull();
      expect(TAPE_SYMBOL_SUGGESTIONS, pair).toContain(pair);
    }
  });

  it("SENTINEL: every offered pair resolves through the REAL resolver", () => {
    // Driven against `toYahooSymbol` itself rather than asserting literals.
    // A test that hard-codes "EURUSD=X" keeps passing on the day the resolver
    // loses FX — which is precisely how the last notice came to be false. If
    // the resolver stops answering a pair, the menu offering it fails HERE.
    for (const pair of ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]) {
      expect(toYahooSymbol(pair), pair).toMatch(/=X$/);
    }
    // Running the real resolver inherits its precedence for free — both of
    // these carry a slash and neither is a currency pair. The character match
    // this replaced got both wrong.
    expect(toYahooSymbol("BTC/USD")).not.toMatch(/=X$/);
    expect(toYahooSymbol("XAU/USD")).toBe("GC=F");
  });

  it("offers nothing the tape cannot quote — the menu matches the kitchen", () => {
    // The lock. Re-adding an unservable instrument to the offered list fails
    // here rather than in front of a trader.
    for (const symbol of TAPE_SYMBOL_SUGGESTIONS) {
      expect(tapeQuoteBlocker(symbol), `suggested: ${symbol}`).toBeNull();
    }
  });

  it("still serves everything the tape CAN quote", () => {
    // The filter must not become a blunt instrument: futures, crypto and
    // equities all stay offered.
    for (const symbol of ["NQ1!", "GC1!", "AAPL", "SPY", "BTC", "ETH", "AMD"]) {
      expect(tapeQuoteBlocker(symbol), symbol).toBeNull();
      expect(TAPE_SYMBOL_SUGGESTIONS, symbol).toContain(symbol);
    }
  });

  it("serves a pair the trader types himself, not just a suggested one", () => {
    // The tape is his list (§24) — a typed pair is normalized and kept, and now
    // it is also QUOTED rather than answered with a confident false reason.
    expect(tapeQuoteBlocker("gbp/usd")).toBeNull();
    expect(withTapeSymbol(["AAPL"], "gbp/usd")).toEqual(["AAPL", "GBP/USD"]);
  });

  it("answers null for a non-symbol rather than inventing a blocker", () => {
    // A blocker string is a CLAIM about a real instrument. Junk is not an
    // instrument the tape is refusing to serve; it is not an instrument.
    for (const value of [null, undefined, 42, {}, "", "   "]) {
      expect(tapeQuoteBlocker(value)).toBeNull();
    }
  });
});

describe("tapeSymbols — no prices live here", () => {
  it("carries symbols only, so there is no seed price to leak as a quote", () => {
    // The catalogue this replaced held 53 hardcoded prices under a comment
    // saying they must never be rendered as a verified quote.
    for (const symbol of [...DEFAULT_TAPE_SYMBOLS, ...TAPE_SYMBOL_SUGGESTIONS]) {
      expect(typeof symbol).toBe("string");
    }
    expect(normalizeTapeSymbol(30_476)).toBeNull();
  });
});
