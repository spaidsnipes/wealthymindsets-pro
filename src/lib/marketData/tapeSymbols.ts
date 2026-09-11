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
 * ── The measured failure this predicate was born for ─────────────────────────
 *
 * The fetcher carried an anonymous `symbols.filter(sym => !sym.includes("/"))`
 * with no comment and no reason attached, so a trader who picked EUR/USD from
 * the suggestion list got a row reading `EUR/USD  quote pending` forever.
 * "Pending" is a promise that something is coming. §8 — a designed boundary
 * must not wear the vocabulary of a transient state. Naming the boundary was
 * right, and this predicate stays as the ONE place the fact is written down.
 *
 * ── The measured failure the NAMED boundary then committed ───────────────────
 *
 * The reason attached to it was false, and had been false since the day before
 * it was written.
 *
 * `03deb2c` (2026-09-07) recorded "no forex feed on the tape" by reading
 * `fetchQuote`'s branch structure: a branch for futures, one for crypto, a
 * fall-through for equities, "and NO branch for forex at all". That reading of
 * the shape is accurate. The conclusion drawn from it is not — forex never
 * needed its own branch, because the equity fall-through's FIRST provider is
 * Yahoo, and `b90886f` (2026-09-06) had already taught `toYahooSymbol` to
 * resolve `EUR/USD` → `EURUSD=X`. The capability landed one day BEFORE the
 * notice denying it.
 *
 * MEASURED against the running route, all four offered pairs:
 *
 *   EUR/USD  1.160497   GBP/USD  1.349856
 *   USD/JPY  154.468994 (observation 3.7s old)   AUD/USD  0.715563
 *
 * every one `resolution: "RESOLVED"`, `fidelity: "OBSERVED"`, with a real
 * `prevClose` (`ohlcObservation.prevClose: true`) so day-change is a genuine
 * reference rather than a fabricated zero. `yahooQuoteObserved` gates on
 * `resolution` alone and never reads volume, so spot FX's honest `volume: 0`
 * costs it nothing at the gate.
 *
 * So the rail refused, with a confident explanation, the one asset class still
 * actively trading while the US equity session was closed. An absent feed and
 * a disowned feed render identically to the trader; only this sentence tells
 * them apart, which is why it must be derived and not remembered.
 *
 * ── Why this asks the resolver instead of matching a character ───────────────
 *
 * A hand-written `"/"` rule is a SECOND opinion about what the tape can serve,
 * kept in a different file from the resolver that actually decides. Two owners,
 * one pixel — the same drift class as the volatility matcher that asked for
 * `"low"` while its producer emitted `"LOW VOLATILITY"`, and the same fix:
 * the consumer consults the producer rather than retyping its belief. Running
 * the real resolver also inherits its precedence for free — `BTC/USD` carries a
 * slash but resolves crypto, and `XAU/USD` resolves to `GC=F` — cases a
 * character match got wrong in both directions.
 *
 * Three callers read this: the fetcher (which symbols to request), the row
 * (what to say when nothing will ever arrive), and the suggestion list below
 * (what to offer at all). One predicate keeps the offer and the capability from
 * drifting apart again.
 */
export function tapeQuoteBlocker(value: unknown): string | null {
  const symbol = normalizeTapeSymbol(value);
  if (symbol === null) return null;
  // The blocked set is currently EMPTY, and that is a recorded decision rather
  // than an oversight: every symbol the add field accepts resolves to a ticker
  // one of the tape's lanes (Yahoo / Coinbase / Alpaca / Finnhub) will attempt.
  // A symbol no provider answers is already handled honestly downstream — it
  // arrives as a refusal carrying the provider's OWN words, or as no answer at
  // all. Neither needs a guess made up here.
  //
  // Keep the seam. The next genuinely unserveable instrument class gets its
  // reason written HERE, derived from a measured provider answer — never from
  // reading which branches happen to exist.
  return null;
}

/**
 * Symbols the add field offers, DERIVED from what the tape can actually serve.
 *
 * A convenience list only — typing something absent from it is expected and
 * supported, which is the entire point of this module. But what is OFFERED is
 * filtered by `tapeQuoteBlocker`, so the menu can never again advertise an
 * instrument no feed can answer.
 *
 * The forex pairs were left in this candidate list on purpose, so that "the day
 * an FX feed is wired, they return by themselves rather than waiting for
 * someone to remember to re-add them." That day turned out to be the day BEFORE
 * they were removed — see `tapeQuoteBlocker`. Deriving the menu from the
 * predicate is what let four pairs come back by correcting one sentence, with
 * no edit to this array at all.
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
