/**
 * WHICH SYMBOLS THE FVG STRIP READS — said on screen (Garden 19, 2026-10-08).
 *
 * The strip used to read "30 symbols" without saying whose thirty or since
 * when. A fixed list is a choice WM made, on a date; a result from it says
 * nothing about a symbol that is not on it. This module names the list and its
 * date, and offers the trader's OWN active watchlist as the universe — read
 * only, through the one watchlist owner (`readStoredActiveWatchlist`), and only
 * when he has stored one (the panel's default seed is WM's list, not his).
 *
 * PURE — no React, no I/O, no clock. The caller hands in what it read.
 */

/**
 * The day the scanner's fixed symbol list was last chosen: it shipped with the
 * first build (39c87585) and no symbol has been added or removed since.
 * `fvgScanUniverse.test.ts` pins the list — change the list, change this date.
 */
export const FVG_SCAN_FIXED_LIST_CHOSEN = "2026-06-21" as const;

/** A watchlist longer than this is read up to here, and the strip says so. */
export const FVG_SCAN_UNIVERSE_MAX = 60;

export type FvgScanUniverseId = "FIXED" | "WATCHLIST";

export interface FvgScanUniverse {
  readonly id: FvgScanUniverseId;
  /** Short name for the chooser. */
  readonly label: string;
  /** The on-screen sentence: which list, how many, chosen by whom and when. */
  readonly line: string;
  readonly symbols: readonly string[];
}

const chosenDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m! - 1]} ${d}, ${y}`;
};
const count = (n: number) => `${n} symbol${n === 1 ? "" : "s"}`;

/** WM's fixed scanner list, named with its date. */
export function fixedFvgScanUniverse(symbols: readonly string[]): FvgScanUniverse {
  return {
    id: "FIXED",
    label: "WM's fixed list",
    line: `WM's fixed scanner list — ${count(symbols.length)}, chosen by WM on ${chosenDay(FVG_SCAN_FIXED_LIST_CHOSEN)}. Not the whole market: a symbol that is not on it was not read.`,
    symbols,
  };
}

/**
 * The trader's own watchlist as the universe; null when he has stored none (or
 * it is empty). Order is his. Read-only — nothing here writes the list.
 */
export function watchlistFvgScanUniverse(watchlist: { readonly name: string; readonly symbols: readonly string[] } | null): FvgScanUniverse | null {
  if (!watchlist || watchlist.symbols.length === 0) return null;
  const all = watchlist.symbols;
  const symbols = all.slice(0, FVG_SCAN_UNIVERSE_MAX);
  const cut = all.length > symbols.length ? ` The first ${symbols.length} of its ${all.length} are read.` : "";
  return {
    id: "WATCHLIST",
    label: `Your watchlist “${watchlist.name}”`,
    line: `Your watchlist “${watchlist.name}” — ${count(all.length)}, chosen by you, as it is saved on this device now.${cut} A symbol that is not on it was not read.`,
    symbols,
  };
}

/** The universes on offer (fixed first), and the one in use — FIXED when the wanted one is not on offer. */
export function fvgScanUniverses(input: {
  readonly fixed: readonly string[];
  readonly watchlist: { readonly name: string; readonly symbols: readonly string[] } | null;
  readonly want: FvgScanUniverseId;
}): { readonly options: readonly FvgScanUniverse[]; readonly active: FvgScanUniverse } {
  const fixed = fixedFvgScanUniverse(input.fixed);
  const own = watchlistFvgScanUniverse(input.watchlist);
  const options = own ? [fixed, own] : [fixed];
  return { options, active: options.find(o => o.id === input.want) ?? fixed };
}
