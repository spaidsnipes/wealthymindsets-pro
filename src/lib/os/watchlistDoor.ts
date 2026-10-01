/** One contextual Watchlist doorway, shared by the chart and Settings. */
const WATCHLIST_OPEN_EVENT = "wm:open-watchlist";

export function requestWatchlist(): void {
  window.dispatchEvent(new Event(WATCHLIST_OPEN_EVENT));
}

export function listenForWatchlist(open: () => void): () => void {
  window.addEventListener(WATCHLIST_OPEN_EVENT, open);
  return () => window.removeEventListener(WATCHLIST_OPEN_EVENT, open);
}
