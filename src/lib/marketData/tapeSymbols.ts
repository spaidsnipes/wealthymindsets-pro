/**
 * THE TRADER'S TAPE IS A LIST THE TRADER OWNS.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `TickerTape` kept a hardcoded catalogue, `TAPE_SYMBOLS`, and the trader's own
 * list, `customSyms`, persisted at `wm-tape-symbols`. The catalogue was doing
 * three jobs at once: it was the DEFAULT list, the FETCH allowlist, and the row
 * seed. So a symbol the trader added but the catalogue had never heard of was
 * kept by the editor and dropped by the rail.
 *
 * `handleAddSym` hid this for exactly one session by pushing onto the module
 * constant at runtime — `(TAPE_SYMBOLS as any[]).push(...)`. Add a symbol and
 * it appears; reload tomorrow and the module is fresh, the catalogue no longer
 * contains it, and it is gone. Measured in the running app with the stored list
 * `["NQ1!","AMD","AAPL"]`:
 *
 *   editor panel   NQ1!  AMD  AAPL      <- the trader's list, all three
 *   ticker rail    NQ1!       AAPL      <- AMD absent
 *
 * Both on screen at the same moment, one row apart. Not "AMD — unavailable",
 * not "AMD — quote pending". Absent, with nothing anywhere saying so, while
 * localStorage still held it and the editor still offered to remove it.
 *
 * ── Why this module and not a bigger array ───────────────────────────────────
 *
 * Adding AMD to the catalogue fixes AMD. The next symbol a trader types is
 * still gone tomorrow. §24: the trader's list is the OWNER of what is on the
 * tape, and a catalogue may not quietly overrule it.
 *
 * Note what the catalogue was actually carrying: a `base` price for every
 * symbol (30_476 for NQ1!, 299 for AAPL, plus a 40-entry `BASES` map for
 * anything typed), under a comment reading "It must never be rendered or
 * restored as a verified quote." Fifty-three hardcoded prices whose only job
 * was to seed a `price` field that nothing renders until a real quote arrives.
 * The surest way to keep that promise is to not hold the numbers. There are no
 * prices in this file, and a tape row starts with no price at all.
 *
 * ── Why the reader is strict ─────────────────────────────────────────────────
 *
 * The catalogue filter was also, accidentally, the only thing standing between
 * a corrupt stored list and the fetch loop: `fetchQuote` calls
 * `sym.toUpperCase()` outside its try, inside a `Promise.all`, so ONE
 * non-string entry rejects the whole round and the entire rail stops updating —
 * every symbol, not just the bad one. Removing the filter without a reader
 * would convert a silent drop into a dead tape, so the reader comes first.
 *
 * PURE — no React, no I/O, no clock, no storage.
 */

import {
  normalizeSymbol,
  readStoredSymbolList,
  withSymbol,
  withoutSymbol,
} from "./storedSymbolList";

/**
 * The tape a trader who has never customised anything sees.
 *
 * This is a DEFAULT, not an allowlist. Nothing here may be required for a
 * symbol to appear on the rail.
 */
export const DEFAULT_TAPE_SYMBOLS: readonly string[] = [
  "NQ1!", "ES1!", "RTY1!", "YM1!", "GC1!", "CL1!",
  "AAPL", "TSLA", "NVDA", "SPY", "QQQ",
  "BTC", "ETH",
] as const;

/**
 * Why the tape cannot quote a symbol, or null when it can.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * The fetcher carried an anonymous `symbols.filter(sym => !sym.includes("/"))`
 * with no comment and no reason attached. The suggestion list offered EUR/USD,
 * GBP/USD, USD/JPY and AUD/USD. So the add field invited the trader to pick a
 * pair, the filter silently dropped it, and the row rendered:
 *
 *   EUR/USD   quote pending
 *
 * forever. "Pending" is a promise that something is coming. Nothing was coming:
 * `fetchQuote` has a branch for futures, one for crypto and a fall-through for
 * equities, and NO branch for forex at all. §8 — a designed boundary must not
 * wear the vocabulary of a transient state.
 *
 * This predicate is the ONE place that fact is written down. Three callers read
 * it: the fetcher (which symbols to request), the row (what to say when it will
 * never arrive), and the suggestion list below (what to offer at all). A second
 * copy would let the offer and the capability drift apart again — which is
 * exactly how EUR/USD came to be on a menu the kitchen could not cook.
 */
export function tapeQuoteBlocker(value: unknown): string | null {
  const symbol = normalizeTapeSymbol(value);
  if (symbol === null) return null;
  // The tape's feeds are Yahoo (futures), Coinbase (crypto) and Finnhub/Alpaca
  // (equities). None of them is wired for FX pairs here.
  if (symbol.includes("/")) return "no forex feed on the tape";
  return null;
}

/**
 * Symbols the add field offers, DERIVED from what the tape can actually serve.
 *
 * A convenience list only — typing something absent from it is expected and
 * supported, which is the entire point of this module. But what is OFFERED is
 * filtered by `tapeQuoteBlocker`, so the menu can never again advertise an
 * instrument no feed can answer. The forex pairs stay in the candidate list on
 * purpose: the day an FX feed is wired, they return by themselves rather than
 * waiting for someone to remember to re-add them.
 */
const SUGGESTION_CANDIDATES: readonly string[] = [
  "NQ1!", "ES1!", "RTY1!", "YM1!", "GC1!", "CL1!", "SI1!", "ZB1!",
  "AAPL", "TSLA", "NVDA", "AMZN", "META", "MSFT", "GOOG", "AMD", "INTC", "NFLX",
  "JPM", "GS", "V", "MA", "LLY", "UNH", "SPY", "QQQ", "IWM", "GLD", "TLT", "XLK", "XLF",
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX",
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD",
] as const;

export const TAPE_SYMBOL_SUGGESTIONS: readonly string[] = SUGGESTION_CANDIDATES.filter(
  (symbol) => tapeQuoteBlocker(symbol) === null,
);

/**
 * The canonical form of a symbol on the tape, or null if it is not one.
 *
 * Uppercased and trimmed so `aapl`, ` AAPL ` and `AAPL` are one symbol rather
 * than three rows quoting the same instrument.
 */
export function normalizeTapeSymbol(value: unknown): string | null {
  return normalizeSymbol(value);
}

/**
 * Read the trader's stored tape, or null if there is nothing readable in it.
 *
 * A single unreadable ENTRY is dropped rather than discarding the trader's
 * other choices — an entry that is not a string was never a symbol he chose,
 * because the add field only ever produces text. A list with NO readable entry
 * returns null, which the caller reads as "no stored preference" and answers
 * with the default. Never throws: unparseable bytes are the same answer.
 */
export function readStoredTapeSymbols(raw: string | null | undefined): string[] | null {
  return readStoredSymbolList(raw);
}

/**
 * Add a symbol to a tape list, or return the list unchanged.
 *
 * Returns the SAME array reference when nothing changed, so a caller storing
 * this in state does not schedule a render for a no-op — and, more importantly,
 * so "already on the tape" is a fact the caller can test by identity rather
 * than by re-deriving the rule.
 */
export function withTapeSymbol(symbols: readonly string[], value: unknown): readonly string[] {
  return withSymbol(symbols, value);
}

/** Remove a symbol from a tape list, or return the list unchanged. */
export function withoutTapeSymbol(symbols: readonly string[], value: unknown): readonly string[] {
  return withoutSymbol(symbols, value);
}
