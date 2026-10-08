/**
 * THE TRADER'S ACTIVE WATCHLIST, readable and writable from any room.
 *
 * `wm_watchlists` (a map of named lists) + `wm_active_watchlist` (the chosen
 * name) are owned by the chart's WatchlistPanel. Other rooms — Scanner first —
 * used to keep private "alerted"/"watched" flags that nothing else read, so a
 * symbol a trader marked in one room never reached the list he trades from.
 * This module lets them add to the SAME list, read by the same rule
 * (`readSymbolList`), starting from the same default seed the panel shows
 * when nothing is stored.
 */
import { readSymbolList } from "@/lib/marketData/storedSymbolList";

export const WATCHLISTS_KEY = "wm_watchlists";
export const ACTIVE_WATCHLIST_KEY = "wm_active_watchlist";
export const DEFAULT_WATCHLIST_NAME = "My Watchlist";
export const DEFAULT_WATCHLIST_SYMBOLS: readonly string[] = [
  "ES1!", "NQ1!", "RTY1!", "YM1!", "SPY", "QQQ",
  "AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "META",
  "GC1!", "CL1!", "BTC", "ETH",
];

type Store = Pick<Storage, "getItem" | "setItem">;

function readLists(store: Store): Record<string, string[]> {
  try {
    const p = JSON.parse(store.getItem(WATCHLISTS_KEY) ?? "null");
    if (p && typeof p === "object") {
      const out: Record<string, string[]> = {};
      for (const k of Object.keys(p)) { const l = readSymbolList(p[k]); if (l) out[k] = l; }
      if (Object.keys(out).length) return out;
    }
  } catch { /* unreadable — the panel's default stands */ }
  return { [DEFAULT_WATCHLIST_NAME]: [...DEFAULT_WATCHLIST_SYMBOLS] };
}

/**
 * The active list ONLY when the trader has stored one — null when nothing
 * readable is stored (the default seed is WM's list, not a choice of his).
 * Read-only: for rooms that offer "your watchlist" and must not offer WM's seed
 * under his name.
 */
export function readStoredActiveWatchlist(store: Pick<Storage, "getItem">): { name: string; symbols: string[] } | null {
  let stored = false;
  try {
    const p = JSON.parse(store.getItem(WATCHLISTS_KEY) ?? "null");
    stored = !!p && typeof p === "object" && Object.keys(p).some(k => readSymbolList(p[k]) !== null);
  } catch { /* unreadable or blocked — nothing of his to offer */ }
  return stored ? readActiveWatchlist({ getItem: k => store.getItem(k), setItem: () => {} }) : null;
}

/** The list the trader is looking at: its name and symbols. */
export function readActiveWatchlist(store: Store): { name: string; symbols: string[] } {
  const lists = readLists(store);
  let want: string | null = null;
  try { want = store.getItem(ACTIVE_WATCHLIST_KEY); } catch { /* blocked */ }
  const name = want && lists[want] ? want : Object.keys(lists)[0]!;
  return { name, symbols: lists[name]! };
}

/** Add or remove `symbol` on the active list. Returns whether it is on the list now. */
export function toggleOnActiveWatchlist(store: Store, symbol: string): boolean {
  const sym = symbol.trim().toUpperCase();
  const lists = readLists(store);
  const { name, symbols } = readActiveWatchlist(store);
  const on = symbols.includes(sym);
  lists[name] = on ? symbols.filter(s => s !== sym) : [...symbols, sym];
  try { store.setItem(WATCHLISTS_KEY, JSON.stringify(lists)); } catch { return on; }
  return !on;
}
