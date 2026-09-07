/**
 * A STORED SYMBOL LIST IS UNTRUSTED INPUT, AND THERE IS ONE RULE FOR READING IT.
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * `TickerTape` learned this the hard way (see tapeSymbols.ts): one non-string
 * entry in a persisted list reached `sym.toUpperCase()` and took a whole fetch
 * round down. That was fixed for the tape. The watchlist had the SAME defect,
 * unfixed, and worse.
 *
 * `WatchlistPanel` reads `wm_watchlists` and de-dupes it —
 * `Array.from(new Set(p[k]))` — without ever asking whether an entry is a
 * symbol. Measured in the running app on /charts with
 * `{"My Watchlist":["AAPL",42,"NVDA"]}`:
 *
 *   TypeError: sym.toUpperCase is not a function
 *   The above error occurred in the <WatchlistPanel> component.
 *   It was handled by the <ErrorBoundary> error boundary.      (×16)
 *
 * The panel did not merely stop updating, as the tape did. It was DESTROYED.
 * AAPL and NVDA — both perfectly readable, both the trader's — disappeared from
 * the screen entirely, along with the add field he would have used to fix it.
 * One junk byte in localStorage costs him the whole watchlist, and there are
 * six separate `sym.toUpperCase()` sites in that file waiting to be the one
 * that throws.
 *
 * ── Why a shared module and not a sixth guard ────────────────────────────────
 *
 * Guarding each call site is symptom-chasing: the seventh gets added later and
 * is unguarded. The boundary is the READ, and there is exactly one rule for it.
 * §24/H21 — one owner, never a second copy. Note the drift this replaces: line
 * 269 of WatchlistPanel already coerced entries with `String(s).toUpperCase()`
 * on a different read path, so the same file had one correct reader and one
 * broken one for the same data.
 *
 * `String(s)` is NOT the rule adopted here. It converts 42 into the "symbol"
 * "42" and `{}` into "[OBJECT OBJECT]" — inventing instruments that were never
 * chosen and that no feed can answer. §14.1: an unreadable value must not be
 * resolved into a confident one. An entry that is not text was never a symbol
 * the trader picked, because every add field in this product produces text.
 *
 * PURE — no React, no I/O, no clock, no storage.
 */

import { readStoredText } from "@/lib/storedShape";

/**
 * The canonical form of a stored symbol, or null if it is not one.
 *
 * Uppercased and trimmed so `aapl`, ` AAPL ` and `AAPL` are one instrument
 * rather than three rows quoting the same thing.
 */
export function normalizeSymbol(value: unknown): string | null {
  const text = readStoredText(value);
  if (text === undefined) return null;
  return text.trim().toUpperCase();
}

/**
 * Read an ALREADY-PARSED value as a symbol list, or null if nothing is readable.
 *
 * Takes a parsed value rather than raw JSON because stored lists are not always
 * the whole document — `wm_watchlists` holds a MAP of named lists, and each
 * value must be read by this same rule.
 *
 * A single unreadable ENTRY is dropped rather than discarding the trader's
 * other choices. A list with NO readable entry returns null, which the caller
 * answers with its default: an empty array would be a claim that the trader
 * chose to watch nothing, and that is a different statement from "nothing here
 * could be read".
 *
 * Order is preserved and duplicates collapse to the first occurrence — the
 * list is the trader's, and it is not re-sorted under him.
 */
export function readSymbolList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const symbols: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const symbol = normalizeSymbol(entry);
    if (symbol === null || seen.has(symbol)) continue;
    seen.add(symbol);
    symbols.push(symbol);
  }
  return symbols.length > 0 ? symbols : null;
}

/**
 * Read stored BYTES as a symbol list, or null if there is nothing readable.
 *
 * Never throws: unparseable bytes are the same answer as an unreadable list.
 */
export function readStoredSymbolList(raw: string | null | undefined): string[] | null {
  if (raw == null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return readSymbolList(parsed);
}

/**
 * Add a symbol to a list, or return the list unchanged.
 *
 * Returns the SAME array reference when nothing changed, so a caller storing
 * this in state does not schedule a render for a no-op — and so "already on the
 * list" is a fact the caller can test by identity rather than by re-deriving
 * the rule.
 */
export function withSymbol(symbols: readonly string[], value: unknown): readonly string[] {
  const symbol = normalizeSymbol(value);
  if (symbol === null) return symbols;
  if (symbols.some((s) => s === symbol)) return symbols;
  return [...symbols, symbol];
}

/** Remove a symbol from a list, or return the list unchanged. */
export function withoutSymbol(symbols: readonly string[], value: unknown): readonly string[] {
  const symbol = normalizeSymbol(value);
  if (symbol === null) return symbols;
  const next = symbols.filter((s) => s !== symbol);
  return next.length === symbols.length ? symbols : next;
}
